const display = document.getElementById('display');
const historyLine = document.getElementById('history');
const buttons = document.querySelectorAll('.keys button');
const installButton = document.getElementById('installButton');
const installHelp = document.getElementById('installHelp');

let expression = '0';
let justCalculated = false;
let installPromptEvent = null;

const operators = ['+', '-', '*', '/', '%'];
const isOperator = (char) => operators.includes(char);
const precedence = (operator) => ((operator === '+' || operator === '-') ? 1 : 2);

function add(a, b) { return a + b; }
function subtract(a, b) { return a - b; }
function multiply(a, b) { return a * b; }
function divide(a, b) {
  if (b === 0) throw new Error('Cannot divide by zero');
  return a / b;
}
function modulo(a, b) {
  if (b === 0) throw new Error('Cannot divide by zero');
  return a % b;
}

function applyOperation(left, right, operator) {
  switch (operator) {
    case '+': return add(left, right);
    case '-': return subtract(left, right);
    case '*': return multiply(left, right);
    case '/': return divide(left, right);
    case '%': return modulo(left, right);
    default: throw new Error('Invalid operator');
  }
}

function tokenize(value) {
  const tokens = [];
  let number = '';

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const previous = value[index - 1];

    if (char === ' ') continue;

    if (/\d|\./.test(char) || (char === '-' && (index === 0 || isOperator(previous)))) {
      if (char === '.' && number.includes('.')) throw new Error('Invalid decimal number');
      number += char;
      continue;
    }

    if (isOperator(char)) {
      if (number === '' || number === '-') throw new Error('Incomplete expression');
      tokens.push(Number(number), char);
      number = '';
      continue;
    }

    throw new Error('Only numbers and normal operators are allowed');
  }

  if (number === '' || number === '-') throw new Error('Incomplete expression');
  tokens.push(Number(number));
  return tokens;
}

function calculateExpression(value) {
  const tokens = tokenize(value);
  const values = [];
  const pendingOperators = [];

  for (const token of tokens) {
    if (typeof token === 'number') {
      if (!Number.isFinite(token)) throw new Error('Invalid number');
      values.push(token);
      continue;
    }

    while (pendingOperators.length && precedence(pendingOperators.at(-1)) >= precedence(token)) {
      const right = values.pop();
      const left = values.pop();
      values.push(applyOperation(left, right, pendingOperators.pop()));
    }

    pendingOperators.push(token);
  }

  while (pendingOperators.length) {
    const right = values.pop();
    const left = values.pop();
    values.push(applyOperation(left, right, pendingOperators.pop()));
  }

  return Number(values[0].toFixed(10));
}

function pretty(value) {
  return value.replaceAll('*', '×').replaceAll('/', '÷');
}

function updateDisplay(value = expression) {
  display.textContent = pretty(value);
}

function appendValue(value) {
  if (justCalculated && !isOperator(value)) {
    expression = '0';
    historyLine.textContent = '';
  }

  justCalculated = false;
  const last = expression.at(-1);
  const currentNumber = expression.split(/[+\-*/%]/).at(-1);

  if (isOperator(value) && isOperator(last)) {
    expression = expression.slice(0, -1) + value;
  } else if (value === '.' && currentNumber.includes('.')) {
    return;
  } else if (expression === '0' && !isOperator(value) && value !== '.') {
    expression = value;
  } else {
    expression += value;
  }

  updateDisplay();
}

function clearCalculator() {
  expression = '0';
  historyLine.textContent = '';
  justCalculated = false;
  updateDisplay();
}

function backspace() {
  expression = expression.length > 1 ? expression.slice(0, -1) : '0';
  justCalculated = false;
  updateDisplay();
}

function calculate() {
  try {
    const result = calculateExpression(expression);
    historyLine.textContent = `${pretty(expression)} =`;
    expression = String(result);
    justCalculated = true;
    updateDisplay();
  } catch (error) {
    historyLine.textContent = error.message;
    display.textContent = 'Error';
    justCalculated = true;
  }
}

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    const { value, action } = button.dataset;
    if (action === 'clear') clearCalculator();
    else if (action === 'backspace') backspace();
    else if (action === 'calculate') calculate();
    else appendValue(value);
  });
});

window.addEventListener('keydown', (event) => {
  const key = event.key;
  const supported = '0123456789.+-*/%';

  if (supported.includes(key)) appendValue(key);
  else if (key === 'Enter' || key === '=') calculate();
  else if (key === 'Backspace') backspace();
  else if (key === 'Escape') clearCalculator();
  else return;

  event.preventDefault();
  const button = [...buttons].find((item) => item.dataset.value === key || (key === 'Enter' && item.dataset.action === 'calculate'));
  if (button) {
    button.classList.add('pressed');
    setTimeout(() => button.classList.remove('pressed'), 120);
  }
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPromptEvent = event;
  installButton.hidden = false;
  installHelp.textContent = 'Click Download App to install this calculator on your device.';
});

installButton.addEventListener('click', async () => {
  if (!installPromptEvent) return;
  installPromptEvent.prompt();
  await installPromptEvent.userChoice;
  installPromptEvent = null;
  installButton.hidden = true;
});

window.addEventListener('appinstalled', () => {
  installButton.hidden = true;
  installHelp.textContent = 'Calculator app installed successfully.';
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js');
  });
}

updateDisplay();
