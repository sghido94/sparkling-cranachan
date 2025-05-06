document.addEventListener('DOMContentLoaded', () => {
    // !!! URL di npoint.io AGGIORNATO !!!
    const API_URL = 'https://api.npoint.io/72cd09c6a23383a9e632';

    const partyNameEl = document.getElementById('partyName');
    const categorySelect = document.getElementById('categorySelect');
    const categoriesContainer = document.getElementById('categoriesContainer');
    const contributionForm = document.getElementById('contributionForm');
    const guestNameInput = document.getElementById('guestName');
    const itemDescriptionInput = document.getElementById('itemDescription');
    const formMessage = document.getElementById('formMessage');
    const loadingMessage = document.getElementById('loadingMessage');
    const shareWhatsAppButton = document.getElementById('shareWhatsApp');

    let currentData = null; // Per tenere traccia dei dati correnti

    // Funzione per recuperare i dati
    async function fetchData() {
        if (loadingMessage) loadingMessage.style.display = 'block';
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`Errore HTTP nel recupero dati: ${response.status}`);
            }
            const data = await response.json();
            // Verifica minima della struttura attesa
            if (!data || typeof data.contributions !== 'object' || !Array.isArray(data.categories)) {
                console.error("Dati recuperati da npoint.io non hanno la struttura attesa:", data);
                throw new Error("Formato dati non valido dal server.");
            }
            currentData = data; // Aggiorna i dati correnti
            renderApp(data);
        } catch (error) {
            console.error('Errore nel recupero dati:', error);
            if (categoriesContainer) {
                 categoriesContainer.innerHTML = `<p class="text-red-500 text-center">Errore nel caricamento dei dati. Controlla la console per dettagli e verifica che l'URL di npoint.io (${API_URL}) sia corretto, accessibile e contenga JSON valido.</p>`;
            }
            if (formMessage) {
                formMessage.textContent = 'Errore di connessione al server.';
                formMessage.className = 'mt-3 text-sm text-center text-red-600';
            }
        } finally {
            if (loadingMessage) loadingMessage.style.display = 'none';
        }
    }

    // Funzione per renderizzare l'applicazione (categorie e contributi)
    function renderApp(data) {
        if (!data) return;

        if (data.partyName && partyNameEl) {
            partyNameEl.textContent = data.partyName;
            document.title = `Contributi ${data.partyName}`;
        }

        if (data.categories && categorySelect) {
            categorySelect.innerHTML = '<option value="" disabled selected>-- Seleziona una categoria --</option>';
            data.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
        }

        if (data.contributions && categoriesContainer) {
            categoriesContainer.innerHTML = '';
            if (data.categories && Array.isArray(data.categories)) {
                data.categories.forEach(categoryName => {
                    const categoryDiv = document.createElement('div');
                    categoryDiv.className = 'mb-6 p-4 bg-white rounded-lg shadow-md';

                    const title = document.createElement('h3');
                    title.className = 'text-xl font-semibold text-indigo-600 category-title';
                    title.textContent = categoryName;
                    categoryDiv.appendChild(title);

                    const ul = document.createElement('ul');
                    ul.className = 'list-disc list-inside space-y-2 pl-2 text-gray-700';

                    // Assicurati che data.contributions[categoryName] sia un array
                    const itemsInCategory = Array.isArray(data.contributions[categoryName]) ? data.contributions[categoryName] : [];
                    
                    if (itemsInCategory.length === 0) {
                        const li = document.createElement('li');
                        li.className = 'text-gray-500 italic contribution-item py-1';
                        li.style.listStyleType = 'none';
                        li.textContent = 'Nessun contributo ancora per questa categoria.';
                        ul.appendChild(li);
                    } else {
                        itemsInCategory.forEach(item => {
                            const li = document.createElement('li');
                            li.className = 'contribution-item py-1';
                            let itemText = `<strong>${item.guestName}</strong>`;
                            if (item.itemDescription) {
                                itemText += `: ${item.itemDescription}`;
                            }
                            itemText += ` <button class="delete-item text-red-500 hover:text-red-700 text-xs ml-2" data-category="${categoryName}" data-guest="${item.guestName}" data-description="${item.itemDescription || ''}"><i class="fas fa-times-circle"></i></button>`;
                            li.innerHTML = itemText;
                            ul.appendChild(li);
                        });
                    }
                    categoryDiv.appendChild(ul);
                    categoriesContainer.appendChild(categoryDiv);
                });
                document.querySelectorAll('.delete-item').forEach(button => {
                    button.addEventListener('click', handleDeleteContribution);
                });
            } else {
                console.error("Formato 'categories' errato o mancante nei dati:", data);
                if (categoriesContainer) categoriesContainer.innerHTML = `<p class="text-red-500 text-center">Errore nel formato dei dati delle categorie.</p>`;
            }
        }
    }

    // Funzione per inviare i dati
    async function postData(updatedData) {
        try {
            const response = await fetch(API_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData), // Qui avviene la conversione in stringa JSON
            });
            if (!response.ok) {
                const errorBody = await response.text();
                console.error("Errore da npoint.io durante il POST:", response.status, errorBody);
                console.error("Dati inviati:", updatedData); // Logga i dati che hai provato a inviare
                throw new Error(`Errore HTTP nell'invio dati: ${response.status}. Dettagli: ${errorBody}`);
            }
            // npoint.io con PUT di solito restituisce i dati salvati o un messaggio di successo
            // Non è strettamente necessario fare response.json() se non usi la risposta,
            // ma è buona prassi per assicurarsi che il server abbia risposto correttamente.
            try {
                return await response.json();
            } catch (e) {
                // Se npoint.io risponde con un testo non JSON (es. "OK") dopo un PUT, va bene lo stesso
                console.log("Risposta da nPoint non era JSON, ma operazione PUT probabilmente OK:", await response.text());
                return updatedData; // Ritorna i dati che hai inviato come se fossero stati confermati
            }
        } catch (error) {
            console.error('Errore critico nell\'invio dati:', error);
            if (formMessage) {
                formMessage.textContent = 'Errore grave nel salvataggio del contributo. Controlla la console.';
                formMessage.className = 'mt-3 text-sm text-center text-red-600';
            }
            throw error;
        }
    }

    if (contributionForm) {
        contributionForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (formMessage) formMessage.textContent = '';

            const guestName = guestNameInput.value.trim();
            const selectedCategory = categorySelect.value;
            const itemDescription = itemDescriptionInput.value.trim();

            if (!guestName || !selectedCategory) {
                if (formMessage) {
                    formMessage.textContent = 'Nome e categoria sono obbligatori.';
                    formMessage.className = 'mt-3 text-sm text-center text-red-600';
                }
                return;
            }

            if (!currentData || typeof currentData.contributions !== 'object' || !currentData.categories) {
                if (formMessage) {
                    formMessage.textContent = 'Dati base non caricati o corrotti. Riprova o ricarica la pagina.';
                    formMessage.className = 'mt-3 text-sm text-center text-red-600';
                }
                await fetchData(); // Tenta di ricaricare i dati base
                return;
            }
            
            const updatedData = JSON.parse(JSON.stringify(currentData)); 

            if (!Array.isArray(updatedData.contributions[selectedCategory])) {
                // Questo non dovrebbe succedere se il JSON iniziale su npoint è corretto
                // e se fetchData carica la struttura corretta.
                console.warn(`La categoria ${selectedCategory} non era un array in contributions. Inizializzo.`);
                updatedData.contributions[selectedCategory] = [];
            }

            updatedData.contributions[selectedCategory].push({
                guestName: guestName,
                itemDescription: itemDescription
            });

            if (formMessage) {
                formMessage.textContent = 'Salvataggio in corso...';
                formMessage.className = 'mt-3 text-sm text-center text-blue-600';
            }

            try {
                await postData(updatedData); // Invia l'intero oggetto aggiornato
                if (formMessage) {
                    formMessage.textContent = 'Contributo aggiunto con successo!';
                    formMessage.className = 'mt-3 text-sm text-center text-green-600';
                }
                if (guestNameInput) guestNameInput.value = '';
                if (itemDescriptionInput) itemDescriptionInput.value = '';
                if (categorySelect) categorySelect.value = '';
                currentData = updatedData; // Aggiorna i dati locali
                renderApp(currentData); // Rirenderizza con i nuovi dati
            } catch (error) {
                // Il messaggio di errore dovrebbe essere già stato gestito da postData
                // o da fetchData se il problema era lì.
                // Per sicurezza, ricarichiamo i dati dal server per riflettere lo stato attuale.
                await fetchData();
            }

            if (formMessage) {
                setTimeout(() => { if (formMessage) formMessage.textContent = ''; }, 3000);
            }
        });
    }

    async function handleDeleteContribution(event) {
        const button = event.currentTarget;
        const category = button.dataset.category;
        const guest = button.dataset.guest;
        const description = button.dataset.description;

        if (!confirm(`Sei sicuro di voler eliminare il contributo "${description || 'generico'}" di ${guest} dalla categoria ${category}?`)) {
            return;
        }

        if (!currentData || !currentData.contributions || !currentData.contributions[category]) {
            alert("Errore: dati locali non consistenti. Riprova dopo un aggiornamento.");
            fetchData();
            return;
        }
        
        const updatedData = JSON.parse(JSON.stringify(currentData));
        const itemsInCategory = updatedData.contributions[category];

        if (!Array.isArray(itemsInCategory)) {
            alert("Errore: la categoria non contiene una lista di contributi valida.");
            fetchData();
            return;
        }

        const itemIndex = itemsInCategory.findIndex(item => 
            item.guestName === guest && (item.itemDescription || '') === description
        );

        if (itemIndex > -1) {
            itemsInCategory.splice(itemIndex, 1);
            
            if (formMessage) {
                formMessage.textContent = 'Eliminazione in corso...';
                formMessage.className = 'mt-3 text-sm text-center text-blue-600';
            }

            try {
                await postData(updatedData);
                if (formMessage) {
                    formMessage.textContent = 'Contributo eliminato!';
                    formMessage.className = 'mt-3 text-sm text-center text-green-600';
                }
                currentData = updatedData;
                renderApp(currentData);
            } catch (error) {
                if (formMessage) {
                    formMessage.textContent = 'Errore durante l\'eliminazione. Controlla la console.';
                    formMessage.className = 'mt-3 text-sm text-center text-red-600';
                }
                await fetchData();
            }
            if (formMessage) {
                setTimeout(() => { if (formMessage) formMessage.textContent = ''; }, 3000);
            }
        } else {
            alert("Contributo non trovato. Potrebbe essere già stato eliminato da qualcun altro.");
            fetchData();
        }
    }

    if (shareWhatsAppButton) {
        shareWhatsAppButton.addEventListener('click', () => {
            const pageUrl = window.location.href;
            const partyTitle = (currentData && currentData.partyName) ? currentData.partyName : "la festa";
            const message = `Ciao! Organizziamo i contributi per ${partyTitle}! Segna cosa porti qui: ${pageUrl}`;
            const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        });
    }

    fetchData();
    setInterval(fetchData, 30000);
});