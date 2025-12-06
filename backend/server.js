const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));

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
        sale.push({ 
          id: id,
          href: href,
          nazwa: nazwa || id
        });
      }
    });
    
    return sale;
  } catch (error) {
    console.error('Błąd pobierania sal:', error.message);
    return [];
  }
}

// Funkcja do sprawdzania wolnych sal
async function sprawdzSale(dzien, lekcja) {
  const sale = await getSale();
  const wolneSale = [];
  
  for (const sala of sale) {
    try {
      const response = await axios.get(`http://planlekcji.lukasiewicz.gorlice.pl/${sala.href}`);
      const $ = cheerio.load(response.data);
      
      const wszystkieTabele = $('table');
      if (wszystkieTabele.length < 2) continue;
      
      const tabela = wszystkieTabele.eq(1);
      const wiersze = tabela.find('tbody tr');
      if (wiersze.length === 0) continue;
      
      const numerWiersza = parseInt(lekcja) + 1;
      const wiersz = wiersze.eq(numerWiersza);
      if (wiersz.length === 0) continue;
      
      const komorki = wiersz.find('td');
      if (komorki.length === 0) continue;
      
      const indeksKomorki = parseInt(dzien) + 1;
      const komorka = komorki.eq(indeksKomorki);
      if (komorka.length === 0) continue;
      
      const htmlKomorki = komorka.html()?.trim() || '';
      const tekstKomorki = komorka.text().trim();
      
      const czyWolna = htmlKomorki === '&nbsp;' || htmlKomorki === '' || tekstKomorki === '';
      
      if (czyWolna) {
        wolneSale.push(sala.nazwa);
      }
    } catch (error) {
      console.error(`Błąd: ${sala.nazwa}`);
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
  
  const wolneSale = await sprawdzSale(dzien, lekcja);
  res.json({ wolneSale });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Serwer działa na http://localhost:${PORT}`);
});