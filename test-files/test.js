// 1. App Configuration ----
const config = {
    apiUrl: 'https://api.example.com',
    timeout: 5000
};
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code

// 1.1 Helper Functions ----
function getData() {
    return fetch(config.apiUrl);
}
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code

function processData(data) {
    return data.map(item => item.value);
}

// 2. Main App ----
class App {
    constructor() {
        this.data = [];
    }
    
    init() {
        this.loadData();
    }
}
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code

// 2.1 Event Handlers ----
document.addEventListener('click', handleClick);

function handleClick(event) {
    console.log('Clicked:', event.target);
}
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
