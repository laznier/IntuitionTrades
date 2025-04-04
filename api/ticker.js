// ticker.js

// Use your API key from your internal environment. (Make sure to configure your build process accordingly.)
const API_KEY = process.env.ALPHAVANTAGE_API_KEY || 'demo'; 
const BASE_URL = 'https://www.alphavantage.co/query';

/**
 * Calls Alpha Vantage SYMBOL_SEARCH endpoint with the provided query.
 * @param {string} query - The search term entered by the user.
 * @returns {Promise<Array>} - Resolves to an array of best matching stock objects.
 */
async function searchStockSymbol(query) {
  const url = `${BASE_URL}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    const data = await response.json();
    return data.bestMatches || [];
  } catch (error) {
    console.error('Error searching stock symbol:', error);
    return [];
  }
}

/**
 * Renders the list of suggestions into the suggestion box.
 * @param {Array} suggestions - Array of suggestion objects.
 */
function renderSuggestions(suggestions) {
  const suggestionBox = document.getElementById('ticker-suggestions');
  suggestionBox.innerHTML = ''; // Clear previous suggestions
  suggestions.forEach(item => {
    const li = document.createElement('li');
    // Alpha Vantage returns keys like "1. symbol" and "2. name"
    li.textContent = `${item["1. symbol"]} - ${item["2. name"]}`;
    li.addEventListener('click', () => {
      document.getElementById('ticker').value = item["1. symbol"];
      suggestionBox.innerHTML = '';
    });
    suggestionBox.appendChild(li);
  });
}

/**
 * Initializes the auto-complete feature by listening to input events.
 */
function initTickerAutocomplete() {
  const tickerInput = document.getElementById('ticker');
  tickerInput.addEventListener('input', async (e) => {
    const query = e.target.value.trim();
    // Only search if at least 2 characters are entered
    if (query.length < 2) {
      document.getElementById('ticker-suggestions').innerHTML = '';
      return;
    }
    const suggestions = await searchStockSymbol(query);
    renderSuggestions(suggestions);
  });
}

// Run the auto-complete initializer when the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', () => {
  initTickerAutocomplete();
});
