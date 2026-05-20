const state = { cards: [], filtered: [] };
const els = {
	status: document.querySelector('#sync-status'),
	stats: document.querySelector('#stats'),
	grid: document.querySelector('#collection-grid'),
	search: document.querySelector('#search'),
	game: document.querySelector('#game-filter'),
	owner: document.querySelector('#owner-filter'),
	refresh: document.querySelector('#refresh'),
	pokemonForm: document.querySelector('#pokemon-form'),
	pokemonQuery: document.querySelector('#pokemon-query'),
	pokemonResults: document.querySelector('#pokemon-results'),
};

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

async function loadCollection() {
	els.status.textContent = 'Loading collection…';
	els.grid.innerHTML = '<div class="empty">Pulling cards from Notion…</div>';
	try {
		const response = await fetch('/api/collection');
		const data = await response.json();
		if (!data.ok) throw new Error(data.error || 'Collection API failed.');
		state.cards = data.cards || [];
		els.status.textContent = `${state.cards.length} unique cards synced`;
		renderOwnerOptions(state.cards);
		applyFilters();
	} catch (error) {
		els.status.textContent = 'Notion sync needs configuration';
		els.grid.innerHTML = `<div class="error">${escapeHtml(error.message)}<br><br>Set NOTION_TOKEN and OWNED_CARDS_DATA_SOURCE_ID in Vercel.</div>`;
		renderStats(null);
	}
}

function renderOwnerOptions(cards) {
	const current = els.owner.value;
	const owners = [...new Set(cards.map(card => card.owner).filter(Boolean))].sort();
	els.owner.innerHTML = '<option value="">All owners</option>' + owners.map(owner => `<option>${escapeHtml(owner)}</option>`).join('');
	els.owner.value = owners.includes(current) ? current : '';
}

function applyFilters() {
	const q = els.search.value.trim().toLowerCase();
	const game = els.game.value;
	const owner = els.owner.value;
	state.filtered = state.cards.filter(card => {
		if (game && card.game !== game) return false;
		if (owner && card.owner !== owner) return false;
		if (q && ![card.name, card.cardId, card.set, card.rarity, card.type, card.owner].filter(Boolean).join(' ').toLowerCase().includes(q)) return false;
		return true;
	});
	renderStats(summarize(state.filtered));
	renderCards(state.filtered);
}

function summarize(cards) {
	return {
		unique: cards.length,
		quantity: cards.reduce((sum, card) => sum + card.quantity, 0),
		value: cards.reduce((sum, card) => sum + ((card.marketPrice || 0) * card.quantity), 0),
		owners: new Set(cards.map(card => card.owner)).size,
	};
}

function renderStats(summary) {
	const stats = summary || { unique: 0, quantity: 0, value: 0, owners: 0 };
	els.stats.innerHTML = [
		['Unique cards', stats.unique],
		['Total quantity', stats.quantity],
		['Portfolio value', currency.format(stats.value)],
		['Owners', stats.owners],
	].map(([label, value]) => `<article class="stat"><span>${label}</span><strong>${value}</strong></article>`).join('');
}

function renderCards(cards) {
	if (!cards.length) {
		els.grid.innerHTML = '<div class="empty">No cards match this view.</div>';
		return;
	}
	els.grid.innerHTML = cards.map(card => `
		<article class="card">
			${card.imageUrl ? `<img src="${escapeAttr(card.imageUrl)}" alt="${escapeAttr(card.name)}" loading="lazy" />` : '<div class="empty">No image</div>'}
			<div class="card-body">
				<h3 class="card-title">${escapeHtml(card.name)}</h3>
				<div class="meta">
					<span class="pill">${escapeHtml(card.game)}</span>
					<span class="pill">${escapeHtml(card.owner)}</span>
					<span class="pill">Qty ${card.quantity}</span>
					${card.cardId ? `<span class="pill">${escapeHtml(card.cardId)}</span>` : ''}
					${card.rarity ? `<span class="pill">${escapeHtml(card.rarity)}</span>` : ''}
					${card.marketPrice ? `<span class="pill price">${currency.format(card.marketPrice)}</span>` : ''}
				</div>
			</div>
		</article>
	`).join('');
}

async function searchPokemon(event) {
	event.preventDefault();
	const query = els.pokemonQuery.value.trim();
	if (!query) return;
	els.pokemonResults.innerHTML = '<div class="empty">Searching TCGdex…</div>';
	try {
		const response = await fetch(`/api/pokemon-search?q=${encodeURIComponent(query)}`);
		const data = await response.json();
		if (!data.ok) throw new Error(data.error || 'Pokemon search failed.');
		renderPokemonResults(data.cards || []);
	} catch (error) {
		els.pokemonResults.innerHTML = `<div class="error">${escapeHtml(error.message)}</div>`;
	}
}

function renderPokemonResults(cards) {
	if (!cards.length) {
		els.pokemonResults.innerHTML = '<div class="empty">No Pokémon cards found.</div>';
		return;
	}
	els.pokemonResults.innerHTML = cards.map(card => `
		<article class="pokemon-result">
			${card.imageUrl ? `<img src="${escapeAttr(card.imageUrl)}" alt="${escapeAttr(card.name)}" loading="lazy" />` : ''}
			<h3>${escapeHtml(card.name)}</h3>
			<p class="meta"><span class="pill">${escapeHtml(card.id)}</span></p>
			<div class="row">
				<input aria-label="Owner" value="Spencer" data-owner-for="${escapeAttr(card.id)}" />
				<button type="button" data-add-pokemon="${escapeAttr(card.id)}">Add</button>
			</div>
		</article>
	`).join('');
}

async function addPokemon(cardId, button) {
	const owner = document.querySelector(`[data-owner-for="${cssEscape(cardId)}"]`)?.value || 'Spencer';
	button.disabled = true;
	button.textContent = 'Adding…';
	try {
		const response = await fetch('/api/add-pokemon-card', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ cardId, owner, quantity: 1 }),
		});
		const data = await response.json();
		if (!data.ok) throw new Error(data.error || 'Add failed.');
		button.textContent = 'Added';
		await loadCollection();
	} catch (error) {
		button.disabled = false;
		button.textContent = 'Retry';
		alert(error.message);
	}
}

function escapeHtml(value) {
	return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}
function escapeAttr(value) { return escapeHtml(value); }
function cssEscape(value) { return value.replace(/"/g, '\\"'); }

els.search.addEventListener('input', applyFilters);
els.game.addEventListener('change', applyFilters);
els.owner.addEventListener('change', applyFilters);
els.refresh.addEventListener('click', loadCollection);
els.pokemonForm.addEventListener('submit', searchPokemon);
els.pokemonResults.addEventListener('click', event => {
	const button = event.target.closest('[data-add-pokemon]');
	if (button) addPokemon(button.dataset.addPokemon, button);
});

loadCollection();
