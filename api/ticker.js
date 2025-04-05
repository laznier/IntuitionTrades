// ticker.js

const API_KEY = process.env.ALPHAVANTAGE_API_KEY || 'demo';
const BASE_URL = 'https://www.alphavantage.co/query';

let lastQuery = '';      // Store the last query to avoid duplicate API calls.
let debounceTimeout = null;

/**
 * Fetch suggestions from Alpha Vantage SYMBOL_SEARCH endpoint.
 * @param {string} query - The user's search query.
 * @returns {Promise<Array>} - Returns an array of suggestion objects.
 */
async function searchStockSymbol(query) {
  const url = `${BASE_URL}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${API_KEY}`;
  try {
    // Force no-cache to get the latest data.
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.bestMatches) {
      console.log("Fetched suggestions for query:", query, data.bestMatches);
      return data.bestMatches;
    } else {
      console.log("No bestMatches found for query:", query, data);
      return [];
    }
  } catch (error) {
    console.error("Error fetching symbol search:", error);
    return [];
  }
}

/**
 * Render suggestions in the suggestions container.
 * @param {Array} suggestions - Array of suggestion objects.
 */
function renderSuggestions(suggestions) {
  const suggestionBox = document.getElementById('ticker-suggestions');
  suggestionBox.innerHTML = ''; // Clear previous suggestions

  if (suggestions.length === 0) {
    suggestionBox.style.display = 'none';
    return;
  }
  suggestionBox.style.display = 'block';

  suggestions.forEach(item => {
    const li = document.createElement('li');
    // Display the symbol and name from the API response.
    li.textContent = `${item["1. symbol"]} - ${item["2. name"]}`;
    li.addEventListener('click', () => {
      document.getElementById('ticker').value = item["1. symbol"];
      suggestionBox.innerHTML = '';
      suggestionBox.style.display = 'none';
    });
    suggestionBox.appendChild(li);
  });
}

/**
 * Initialize the auto-complete functionality with debounce.
 */
function initTickerAutocomplete() {
  const tickerInput = document.getElementById('ticker');
  tickerInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    // Clear suggestions if the query is too short.
    if (query.length < 2) {
      document.getElementById('ticker-suggestions').innerHTML = '';
      document.getElementById('ticker-suggestions').style.display = 'none';
      return;
    }
    
    // Debounce API calls: clear previous timeout and set a new one.
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(async () => {
      if (query === lastQuery) return; // Skip if the query hasn't changed.
      lastQuery = query;
      const suggestions = await searchStockSymbol(query);
      renderSuggestions(suggestions);
    }, 300);
  });
}

document.addEventListener('DOMContentLoaded', initTickerAutocomplete);
