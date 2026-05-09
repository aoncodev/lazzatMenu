// --- i18n ---
const LANGS = {
  en: {
    title: 'Lazzat Menu Calculator',
    tab_ingredients: 'Ingredients',
    tab_menu: 'Menu',
    add_ingredient: 'Add Ingredient',
    name: 'Name',
    category: 'Category',
    weight: 'Weight',
    volume: 'Volume',
    count: 'Count',
    display_unit: 'Display Unit',
    unit: 'Unit',
    price_krw: 'Price (KRW)',
    updated: 'Updated',
    add: 'Add',
    delete: 'Delete',
    add_menu_item: '+ Add Menu Item',
    edit_menu_item: 'Edit Menu Item',
    portions: 'Portions',
    sell_price: 'Sell Price (KRW)',
    target_margin: 'Target Margin %',
    recipe_items: 'Recipe Items',
    add_row: '+ Add Row',
    save: 'Save',
    cancel: 'Cancel',
    show_recipe: 'Show recipe',
    hide_recipe: 'Hide recipe',
    edit: 'Edit',
    cost_per_portion: 'Cost/portion',
    total_batch: 'Total batch',
    ingredient: 'Ingredient',
    qty: 'Qty',
    cost: 'Cost',
    piece: 'piece',
    select: 'Select...',
    portions_label: 'portions',
    sell_label: 'Sell',
  },
  ru: {
    title: 'Лаззат — Калькулятор меню',
    tab_ingredients: 'Ингредиенты',
    tab_menu: 'Меню',
    add_ingredient: 'Добавить ингредиент',
    name: 'Название',
    category: 'Категория',
    weight: 'Вес',
    volume: 'Объём',
    count: 'Штуки',
    display_unit: 'Единица',
    unit: 'Единица',
    price_krw: 'Цена (KRW)',
    updated: 'Обновлено',
    add: 'Добавить',
    delete: 'Удалить',
    add_menu_item: '+ Добавить блюдо',
    edit_menu_item: 'Редактировать блюдо',
    portions: 'Порции',
    sell_price: 'Цена продажи (KRW)',
    target_margin: 'Целевая маржа %',
    recipe_items: 'Состав рецепта',
    add_row: '+ Добавить строку',
    save: 'Сохранить',
    cancel: 'Отмена',
    show_recipe: 'Показать рецепт',
    hide_recipe: 'Скрыть рецепт',
    edit: 'Редактировать',
    cost_per_portion: 'Себестоимость/порция',
    total_batch: 'Общая партия',
    ingredient: 'Ингредиент',
    qty: 'Кол-во',
    cost: 'Стоимость',
    piece: 'штука',
    select: 'Выбрать...',
    portions_label: 'порций',
    sell_label: 'Продажа',
  },
};

let currentLang = localStorage.getItem('lazzat-lang') || 'en';

function t(key) {
  return LANGS[currentLang][key] || LANGS.en[key] || key;
}

function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.getElementById('lang-toggle').textContent = currentLang === 'en' ? 'RU' : 'EN';
  document.title = t('title');
}

function toggleLang() {
  currentLang = currentLang === 'en' ? 'ru' : 'en';
  localStorage.setItem('lazzat-lang', currentLang);
  applyLang();
  // Re-render dynamic content
  renderIngredients();
  const menuPage = document.getElementById('page-menu');
  if (!menuPage.classList.contains('hidden')) loadMenu();
}

// --- Helpers ---
const API = '/api';
let ingredientsCache = [];

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Error ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function showError(msg) {
  const el = document.getElementById('error-banner');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

function fmt(n) {
  return n == null ? '—' : Math.round(n).toLocaleString();
}

// --- Tabs ---
function showTab(tab) {
  document.getElementById('page-ingredients').classList.toggle('hidden', tab !== 'ingredients');
  document.getElementById('page-menu').classList.toggle('hidden', tab !== 'menu');
  document.getElementById('tab-ingredients').className =
    tab === 'ingredients'
      ? 'px-4 py-2 rounded font-medium text-sm bg-indigo-600 text-white'
      : 'px-4 py-2 rounded font-medium text-sm bg-gray-200 text-gray-700';
  document.getElementById('tab-menu').className =
    tab === 'menu'
      ? 'px-4 py-2 rounded font-medium text-sm bg-indigo-600 text-white'
      : 'px-4 py-2 rounded font-medium text-sm bg-gray-200 text-gray-700';
  applyLang();
  if (tab === 'ingredients') loadIngredients();
  if (tab === 'menu') loadMenu();
}

// --- Ingredients ---
async function loadIngredients() {
  try {
    ingredientsCache = await api('/ingredients');
    renderIngredients();
  } catch (e) { showError(e.message); }
}

function renderIngredients() {
  const tbody = document.getElementById('ingredients-table');
  tbody.innerHTML = ingredientsCache.map(ing => `
    <tr class="border-t">
      <td class="px-4 py-2">${ing.name}</td>
      <td class="px-4 py-2">${t(ing.category)}</td>
      <td class="px-4 py-2">${ing.display_unit}</td>
      <td class="px-4 py-2 text-right">
        <span class="price-display cursor-pointer hover:text-indigo-600" onclick="startEditPrice(this, ${ing.id})">${fmt(ing.price_in_display_unit)}</span>
      </td>
      <td class="px-4 py-2 text-right text-xs text-gray-400">${new Date(ing.updated_at).toLocaleDateString()}</td>
      <td class="px-4 py-2 text-right">
        <button onclick="deleteIngredient(${ing.id})" class="text-red-500 hover:text-red-700 text-xs">${t('delete')}</button>
      </td>
    </tr>
  `).join('');
}

function startEditPrice(el, id) {
  const ing = ingredientsCache.find(i => i.id === id);
  const current = ing.price_in_display_unit;
  el.innerHTML = `<input type="number" step="any" value="${current}" class="border rounded px-1 py-0.5 text-sm w-24 text-right" autofocus>`;
  const input = el.querySelector('input');
  input.focus();
  input.select();
  const save = async () => {
    const val = parseFloat(input.value);
    if (isNaN(val)) { loadIngredients(); return; }
    try {
      await api(`/ingredients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ price_in_display_unit: val }),
      });
      loadIngredients();
    } catch (e) { showError(e.message); }
  };
  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
}

async function deleteIngredient(id) {
  try {
    await api(`/ingredients/${id}`, { method: 'DELETE' });
    loadIngredients();
  } catch (e) { showError(e.message); }
}

document.getElementById('ingredient-form').addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await api('/ingredients', {
      method: 'POST',
      body: JSON.stringify({
        name: f.get('name'),
        category: f.get('category'),
        display_unit: f.get('display_unit'),
        price_in_display_unit: parseFloat(f.get('price_in_display_unit')),
      }),
    });
    e.target.reset();
    loadIngredients();
  } catch (e2) { showError(e2.message); }
});

// --- Menu ---
async function loadMenu() {
  try {
    const items = await api('/menu');
    renderMenu(items);
  } catch (e) { showError(e.message); }
}

function renderMenu(items) {
  const container = document.getElementById('menu-cards');
  container.innerHTML = items.map(item => {
    const marginColor = item.hits_target === true ? 'text-green-600 bg-green-100'
      : item.hits_target === false ? 'text-red-600 bg-red-100'
      : 'text-gray-600 bg-gray-100';
    return `
      <div class="bg-white rounded shadow p-4">
        <div class="flex items-start justify-between">
          <div>
            <h3 class="font-semibold text-lg">${item.name}</h3>
            <p class="text-sm text-gray-500">${item.portions} ${t('portions_label')} &middot; ${t('sell_label')}: ${fmt(item.sell_price)} KRW</p>
          </div>
          <div class="text-right">
            <span class="inline-block px-2 py-0.5 rounded text-sm font-medium ${marginColor}">
              ${item.margin_pct != null ? item.margin_pct.toFixed(1) + '%' : '—'}
            </span>
          </div>
        </div>
        <div class="mt-2 flex gap-4 text-sm">
          <span>${t('cost_per_portion')}: <strong>${fmt(item.cost_per_portion)} KRW</strong></span>
          <span>${t('total_batch')}: ${fmt(item.total_cost)} KRW</span>
        </div>
        <div class="mt-2 flex gap-2">
          <button onclick="toggleRecipe(${item.id}, this)" class="text-xs text-indigo-600 font-medium">${t('show_recipe')}</button>
          <button onclick="editMenuItem(${item.id})" class="text-xs text-gray-500 hover:text-gray-700">${t('edit')}</button>
          <button onclick="deleteMenuItem(${item.id})" class="text-xs text-red-500 hover:text-red-700">${t('delete')}</button>
        </div>
        <div id="recipe-${item.id}" class="hidden mt-2"></div>
      </div>
    `;
  }).join('');
}

async function toggleRecipe(id, btn) {
  const el = document.getElementById(`recipe-${id}`);
  if (!el.classList.contains('hidden')) {
    el.classList.add('hidden');
    btn.textContent = t('show_recipe');
    return;
  }
  try {
    const detail = await api(`/menu/${id}`);
    el.innerHTML = `
      <table class="w-full text-xs">
        <thead><tr class="text-gray-500">
          <th class="text-left py-1">${t('ingredient')}</th>
          <th class="text-right py-1">${t('qty')}</th>
          <th class="text-right py-1">${t('unit')}</th>
          <th class="text-right py-1">${t('cost')}</th>
        </tr></thead>
        <tbody>${detail.recipe.map(r => `
          <tr class="border-t">
            <td class="py-1">${r.ingredient}</td>
            <td class="text-right py-1">${r.quantity}</td>
            <td class="text-right py-1">${r.unit}</td>
            <td class="text-right py-1">${fmt(r.line_cost)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
    el.classList.remove('hidden');
    btn.textContent = t('hide_recipe');
  } catch (e) { showError(e.message); }
}

// --- Menu form ---
function showMenuForm(editData) {
  document.getElementById('menu-form-container').classList.remove('hidden');
  document.getElementById('btn-add-menu').classList.add('hidden');
  const form = document.getElementById('menu-form');
  form.reset();
  form.edit_id.value = '';
  document.getElementById('recipe-rows').innerHTML = '';
  document.getElementById('menu-form-title').textContent = t('add_menu_item');
  document.getElementById('menu-form-title').dataset.i18n = 'add_menu_item';

  if (editData) {
    document.getElementById('menu-form-title').textContent = t('edit_menu_item');
    document.getElementById('menu-form-title').dataset.i18n = 'edit_menu_item';
    form.edit_id.value = editData.id;
    form.name.value = editData.name;
    form.portions.value = editData.portions;
    form.sell_price.value = editData.sell_price;
    form.target_margin_pct.value = editData.target_margin_pct ?? '';
    editData.recipe.forEach(r => addRecipeRow(r.ingredient_id, r.quantity, r.unit));
  } else {
    addRecipeRow();
  }
  loadIngredientsForSelect();
}

function hideMenuForm() {
  document.getElementById('menu-form-container').classList.add('hidden');
  document.getElementById('btn-add-menu').classList.remove('hidden');
}

async function loadIngredientsForSelect() {
  if (!ingredientsCache.length) {
    ingredientsCache = await api('/ingredients');
  }
  document.querySelectorAll('.recipe-ingredient-select').forEach(sel => {
    const current = sel.value;
    sel.innerHTML = `<option value="">${t('select')}</option>` +
      ingredientsCache.map(i => `<option value="${i.id}" ${i.id == current ? 'selected' : ''}>${i.name} (${i.display_unit})</option>`).join('');
  });
}

function addRecipeRow(ingredientId, qty, unit) {
  const div = document.createElement('div');
  div.className = 'flex gap-1 items-center';
  div.innerHTML = `
    <select class="recipe-ingredient-select border rounded px-1 py-0.5 text-sm flex-1" data-val="${ingredientId || ''}"></select>
    <input type="number" step="any" placeholder="${t('qty')}" value="${qty ?? ''}" class="recipe-qty border rounded px-1 py-0.5 text-sm w-20">
    <input type="text" placeholder="${t('unit')}" value="${unit || ''}" class="recipe-unit border rounded px-1 py-0.5 text-sm w-16">
    <button type="button" onclick="this.parentElement.remove()" class="text-red-400 text-xs px-1">x</button>
  `;
  document.getElementById('recipe-rows').appendChild(div);
  loadIngredientsForSelect();
}

async function editMenuItem(id) {
  try {
    const detail = await api(`/menu/${id}`);
    showTab('menu');
    showMenuForm(detail);
  } catch (e) { showError(e.message); }
}

async function deleteMenuItem(id) {
  try {
    await api(`/menu/${id}`, { method: 'DELETE' });
    loadMenu();
  } catch (e) { showError(e.message); }
}

document.getElementById('menu-form').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const editId = form.edit_id.value;
  const rows = document.querySelectorAll('#recipe-rows > div');
  const recipe = [];
  rows.forEach(row => {
    const ingId = row.querySelector('.recipe-ingredient-select').value;
    const qty = row.querySelector('.recipe-qty').value;
    const unit = row.querySelector('.recipe-unit').value;
    if (ingId && qty && unit) {
      recipe.push({ ingredient_id: parseInt(ingId), quantity: parseFloat(qty), input_unit: unit });
    }
  });

  const body = {
    name: form.name.value,
    portions: parseInt(form.portions.value),
    sell_price: parseFloat(form.sell_price.value),
    target_margin_pct: form.target_margin_pct.value ? parseFloat(form.target_margin_pct.value) : null,
    recipe,
  };

  try {
    if (editId) {
      await api(`/menu/${editId}`, { method: 'PATCH', body: JSON.stringify(body) });
    } else {
      await api('/menu', { method: 'POST', body: JSON.stringify(body) });
    }
    hideMenuForm();
    loadMenu();
  } catch (e2) { showError(e2.message); }
});

// --- Init ---
applyLang();
loadIngredients();
