const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));

// Cache z danymi wszystkich sal
let cacheZajec = null;
let lastUpdate = null;

// Funkcja do pobierania listy sal
async function getSale() {
  try {
    const response = await axios.get('http://planlekcji.lukasiewicz.gorlice.pl/lista.html');
    const $ = cheerio.load(response.data);
    const sale = [];
    
    $('a').each((i, element) => {
      const href = $(element).attr('href');
      const nazwa = $(element).text().trim();
      
      if (href && href.match(/plany\/s\d+\.html$/)) {
        const id = href.match(/s\d+/)[0];
        sale.push({ id, href, nazwa: nazwa || id });
      }
    });
    
    return sale;
  } catch (error) {
    console.error('Błąd pobierania sal:', error.message);
    return [];
  }
}

// Funkcja do pobrania planu jednej sali
async function pobierzPlanSali(sala) {
  try {
    const response = await axios.get(`http://planlekcji.lukasiewicz.gorlice.pl/${sala.href}`);
    const $ = cheerio.load(response.data);
    
    const wszystkieTabele = $('table');
    if (wszystkieTabele.length < 2) return null;
    
    const tabela = wszystkieTabele.eq(1);
    const wiersze = tabela.find('tbody tr');
    if (wiersze.length === 0) return null;
    
    const plan = {};
    
    // Iterujemy po wszystkich lekcjach (pomijamy nagłówek)
    for (let lekcja = 1; lekcja <= 13; lekcja++) {
      const numerWiersza = lekcja + 1;
      const wiersz = wiersze.eq(numerWiersza);
      if (wiersz.length === 0) continue;
      
      const komorki = wiersz.find('td');
      if (komorki.length === 0) continue;
      
      plan[lekcja] = {};
      
      // Iterujemy po wszystkich dniach
      for (let dzien = 1; dzien <= 5; dzien++) {
        const indeksKomorki = dzien + 1;
        const komorka = komorki.eq(indeksKomorki);
        if (komorka.length === 0) continue;
        
        const htmlKomorki = komorka.html()?.trim() || '';
        const tekstKomorki = komorka.text().trim();
        const czyWolna = htmlKomorki === '&nbsp;' || htmlKomorki === '' || tekstKomorki === '';
        
        plan[lekcja][dzien] = czyWolna;
      }
    }
    
    return { nazwa: sala.nazwa, plan };
  } catch (error) {
    console.error(`Błąd: ${sala.nazwa}`);
    return null;
  }
}

// Funkcja do załadowania wszystkich danych
async function zaladujWszystkieDane() {
  console.log('Ładowanie danych ze strony szkoły...');
  const startTime = Date.now();
  
  const sale = await getSale();
  console.log(`Znaleziono ${sale.length} sal`);
  
  const daneSal = [];
  
  // Pobieramy plany wszystkich sal równolegle (szybciej)
  const promises = sale.map(sala => pobierzPlanSali(sala));
  const wyniki = await Promise.all(promises);
  
  for (const wynik of wyniki) {
    if (wynik) daneSal.push(wynik);
  }
  
  cacheZajec = daneSal;
  lastUpdate = new Date();
  
  const czasLadowania = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✓ Załadowano dane ${daneSal.length} sal w ${czasLadowania}s`);
}

// Funkcja do znajdowania wolnych sal z cache
function znajdzWolneSale(dzien, lekcja) {
  if (!cacheZajec) return [];
  
  const wolneSale = [];
  
  for (const sala of cacheZajec) {
    const czyWolna = sala.plan[lekcja]?.[dzien];
    if (czyWolna) {
      wolneSale.push(sala.nazwa);
    }
  }
  
  return wolneSale;
}

// Endpoint do pobierania wolnych sal
app.get('/wolne-sale', async (req, res) => {
  const { dzien, lekcja } = req.query;
  
  if (!dzien || !lekcja) {
    return res.status(400).json({ error: 'Podaj dzień i numer lekcji' });
  }
  
  // Jeśli nie ma cache, załaduj dane
  if (!cacheZajec) {
    await zaladujWszystkieDane();
  }
  
  const wolneSale = znajdzWolneSale(parseInt(dzien), parseInt(lekcja));
  res.json({ wolneSale, lastUpdate });
});

// Endpoint do odświeżenia danych
app.get('/odswiez', async (req, res) => {
  await zaladujWszystkieDane();
  res.json({ success: true, lastUpdate });
});

const PORT = 3000;
app.listen(PORT, async () => {
  console.log(`Serwer działa na http://localhost:${PORT}`);
  // Automatycznie załaduj dane przy starcie
  await zaladujWszystkieDane();
});