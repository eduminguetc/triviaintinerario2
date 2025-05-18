// index.js

// --- IMPORTACIONES DE MÓDULOS DE PREGUNTAS ---
import { unit1Questions } from './unit1_questions.js';
import { unit2Questions } from './unit2_questions.js';
import { unit3Questions } from './unit3_questions.js';
import { unit4Questions } from './unit4_questions.js';
import { unit5Questions } from './unit5_questions.js';
import { unit6Questions } from './unit6_questions.js';

// --- CONSTANTES DEL JUEGO ---
const QUESTIONS_PER_GAME = 25;
const TOTAL_UNITS = 6; // Número total de unidades temáticas
const MIN_QUESTIONS_PER_UNIT_REPRESENTATION = 3; // Mínimo de preguntas a seleccionar de cada unidad
const MIN_TOTAL_QUESTIONS_BANK_REQUIRED = QUESTIONS_PER_GAME; // Mínimo total de preguntas en el banco para jugar
// Aseguramos que haya suficientes preguntas por unidad para la representación mínima.
const MIN_QUESTIONS_PER_UNIT_BANK_REQUIRED = MIN_QUESTIONS_PER_UNIT_REPRESENTATION;

// --- VARIABLES GLOBALES DEL ESTADO DEL JUEGO ---
let allQuestions = []; // Array para almacenar todas las preguntas cargadas
let currentQuestionsForGame = []; // Array para las preguntas de la partida actual
let currentQuestionIndex = 0;
let score = {
    correct: 0,
    incorrect: 0
};
let lastGameQuestionIds = []; // IDs de las preguntas de la última partida para evitar repetición inmediata

// --- REFERENCIAS A ELEMENTOS DEL DOM ---
let startScreen, questionScreen, endScreen;
let startGameBtn, nextQuestionBtn, playAgainBtn;
let questionCounter, scoreCounter, questionText, optionsContainer;
let feedbackText, explanationText, errorMessageContainer;
let correctAnswersFinal, incorrectAnswersFinal;

/**
 * Asigna las variables globales a los elementos del DOM correspondientes.
 */
function assignDOMelements() {
    console.log("Assigning DOM elements...");
    startScreen = document.getElementById('start-screen');
    questionScreen = document.getElementById('question-screen');
    endScreen = document.getElementById('end-screen');

    startGameBtn = document.getElementById('start-game-btn');
    nextQuestionBtn = document.getElementById('next-question-btn');
    playAgainBtn = document.getElementById('play-again-btn');

    questionCounter = document.getElementById('question-counter');
    scoreCounter = document.getElementById('score-counter');
    questionText = document.getElementById('question-text');
    optionsContainer = document.getElementById('options-container');

    feedbackText = document.getElementById('feedback-text');
    explanationText = document.getElementById('explanation-text');
    errorMessageContainer = document.getElementById('error-message-container');

    correctAnswersFinal = document.getElementById('correct-answers-final');
    incorrectAnswersFinal = document.getElementById('incorrect-answers-final');
    console.log("DOM elements assigned.");
}

/**
 * Carga todas las preguntas de los módulos importados.
 * @returns {Promise<boolean>} True si las preguntas se cargaron correctamente, false en caso contrario.
 */
async function loadAllQuestions() {
    console.log("Loading all questions from modules...");
    try {
        // Combinar todas las preguntas de los módulos importados
        allQuestions = [
            ...(unit1Questions || []), // Usar || [] para evitar errores si algún módulo no carga o está vacío
            ...(unit2Questions || []),
            ...(unit3Questions || []),
            ...(unit4Questions || []),
            ...(unit5Questions || []),
            ...(unit6Questions || [])
        ];

        if (!allQuestions || allQuestions.length === 0) {
            console.error("No questions loaded! The combined array is empty or undefined.");
            errorMessageContainer.textContent = "Error: No se encontraron preguntas en los archivos.";
            return false;
        }

        // Verificación adicional de la estructura de las preguntas (opcional pero recomendado)
        if (allQuestions.some(q => typeof q.id === 'undefined' || typeof q.questionText === 'undefined')) {
            console.error("Some questions have an invalid structure.");
            errorMessageContainer.textContent = "Error: Algunas preguntas tienen un formato incorrecto.";
            // Podrías filtrar las preguntas mal formadas si es necesario
            // allQuestions = allQuestions.filter(q => typeof q.id !== 'undefined' && typeof q.questionText !== 'undefined');
            // if (allQuestions.length === 0) return false;
            return false; // O ser estricto y no continuar
        }

        console.log(`${allQuestions.length} questions loaded successfully from modules.`);
        return true;
    } catch (error) {
        console.error("Error loading question modules:", error);
        errorMessageContainer.textContent = "Error al cargar los módulos de preguntas. Revisa la consola.";
        allQuestions = []; // Asegurar que esté vacío si hay error
        return false;
    }
}


/**
 * Verifica si hay suficientes preguntas para iniciar el juego.
 * @returns {boolean} True si hay suficientes preguntas, false en caso contrario.
 */
function checkQuestionAvailability() {
    if (!allQuestions || allQuestions.length < MIN_TOTAL_QUESTIONS_BANK_REQUIRED) {
        errorMessageContainer.textContent = `No hay suficientes preguntas en total para iniciar el juego. Se necesitan al menos ${MIN_TOTAL_QUESTIONS_BANK_REQUIRED}. Hay ${allQuestions.length} disponibles.`;
        console.error("Error: Not enough total questions.", allQuestions.length);
        return false;
    }

    const questionsByUnit = groupQuestionsByUnit(allQuestions);
    for (let i = 1; i <= TOTAL_UNITS; i++) {
        const unitSpecificQuestions = questionsByUnit[i] || [];
        if (unitSpecificQuestions.length < MIN_QUESTIONS_PER_UNIT_BANK_REQUIRED) {
            errorMessageContainer.textContent = `No hay suficientes preguntas para la unidad ${i}. Se necesitan al menos ${MIN_QUESTIONS_PER_UNIT_BANK_REQUIRED}. Hay ${unitSpecificQuestions.length} disponibles.`;
            console.error(`Error: Not enough questions for unit ${i}. Found ${unitSpecificQuestions.length}`);
            return false;
        }
    }
    errorMessageContainer.textContent = ''; // Limpiar mensajes de error previos
    return true;
}

/**
 * Agrupa las preguntas por unidad.
 * @param {Array} questionsArray - El array de todas las preguntas.
 * @returns {Object} Un objeto donde las claves son los números de unidad y los valores son arrays de preguntas.
 */
function groupQuestionsByUnit(questionsArray) {
    return questionsArray.reduce((acc, question) => {
        if (!acc[question.unit]) {
            acc[question.unit] = [];
        }
        acc[question.unit].push(question);
        return acc;
    }, {});
}

/**
 * Baraja un array utilizando el algoritmo Fisher-Yates.
 * @param {Array} array - El array a barajar.
 * @returns {Array} El array barajado.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Selecciona las preguntas para la partida actual.
 * @returns {Array|null} Un array de preguntas para el juego o null si no se pueden seleccionar.
 */
function selectQuestionsForGame() {
    console.log("Selecting questions for game. Last game IDs:", lastGameQuestionIds);
    let selectedQuestions = [];
    let availableQuestionsByUnit = groupQuestionsByUnit(allQuestions);
    let usedQuestionIdsInThisSelection = new Set();

    // 1. Garantizar representación mínima por unidad
    for (let unitNum = 1; unitNum <= TOTAL_UNITS; unitNum++) {
        let unitQuestions = availableQuestionsByUnit[unitNum] ? [...availableQuestionsByUnit[unitNum]] : [];
        if (unitQuestions.length < MIN_QUESTIONS_PER_UNIT_REPRESENTATION) {
            console.error(`Not enough questions in unit ${unitNum} to meet minimum representation.`);
            errorMessageContainer.textContent = `Faltan preguntas en la unidad ${unitNum} para la selección mínima.`;
            return null; // No se puede cumplir el requisito
        }

        shuffleArray(unitQuestions);

        let countForThisUnit = 0;
        // Intentar seleccionar preguntas no usadas en la partida anterior Y no seleccionadas ya en este lote
        for (let question of unitQuestions) {
            if (countForThisUnit < MIN_QUESTIONS_PER_UNIT_REPRESENTATION &&
                !lastGameQuestionIds.includes(question.id) &&
                !usedQuestionIdsInThisSelection.has(question.id)) {
                selectedQuestions.push(question);
                usedQuestionIdsInThisSelection.add(question.id);
                countForThisUnit++;
            }
        }

        // Si no se alcanzó el mínimo con preguntas "nuevas" (no en lastGame Y no en usedThisSelection),
        // permitir repetición de esa unidad (preguntas que podrían estar en lastGame pero no en usedThisSelection)
        if (countForThisUnit < MIN_QUESTIONS_PER_UNIT_REPRESENTATION) {
            for (let question of unitQuestions) {
                if (countForThisUnit < MIN_QUESTIONS_PER_UNIT_REPRESENTATION &&
                    !usedQuestionIdsInThisSelection.has(question.id)) { // Solo verificar que no esté ya en este lote
                    selectedQuestions.push(question);
                    usedQuestionIdsInThisSelection.add(question.id);
                    countForThisUnit++;
                    console.log(`Allowing potential repeat from unit ${unitNum} to meet minimum: ${question.id}`);
                }
            }
        }
         // Si aún así no se alcanza (banco de preguntas de la unidad es muy pequeño y todas ya están en usedQuestionIdsInThisSelection, lo cual es un error lógico si MIN_QUESTIONS_PER_UNIT_BANK_REQUIRED es >= MIN_QUESTIONS_PER_UNIT_REPRESENTATION)
        if (countForThisUnit < MIN_QUESTIONS_PER_UNIT_REPRESENTATION) {
            console.error(`CRITICAL: Could not select ${MIN_QUESTIONS_PER_UNIT_REPRESENTATION} for unit ${unitNum} even after allowing repeats from last game. This might indicate an issue with question bank size for the unit or selection logic.`);
            errorMessageContainer.textContent = `Error crítico al seleccionar preguntas para la unidad ${unitNum}.`;
            return null;
        }
    }
    console.log(`Guaranteed ${selectedQuestions.length} questions from unit representation.`);

    // 2. Completar aleatoriamente hasta QUESTIONS_PER_GAME
    let remainingQuestionsPool = [];
    allQuestions.forEach(q => {
        // Añadir solo preguntas que NO hayan sido seleccionadas en el paso 1 (garantía de unidad)
        if (!usedQuestionIdsInThisSelection.has(q.id)) {
            remainingQuestionsPool.push(q);
        }
    });
    shuffleArray(remainingQuestionsPool);

    // Priorizar preguntas que no estuvieron en la última partida
    let preferredRemaining = remainingQuestionsPool.filter(q => !lastGameQuestionIds.includes(q.id));
    let nonPreferredRemaining = remainingQuestionsPool.filter(q => lastGameQuestionIds.includes(q.id)); // Preguntas que sí estuvieron en la última partida

    while (selectedQuestions.length < QUESTIONS_PER_GAME && (preferredRemaining.length > 0 || nonPreferredRemaining.length > 0)) {
        if (preferredRemaining.length > 0) {
            let questionToAdd = preferredRemaining.shift();
             if (!usedQuestionIdsInThisSelection.has(questionToAdd.id)) { // Doble chequeo por si acaso
                selectedQuestions.push(questionToAdd);
                usedQuestionIdsInThisSelection.add(questionToAdd.id);
            }
        } else if (nonPreferredRemaining.length > 0) {
            let questionToAdd = nonPreferredRemaining.shift();
            if (!usedQuestionIdsInThisSelection.has(questionToAdd.id)) {
                selectedQuestions.push(questionToAdd);
                usedQuestionIdsInThisSelection.add(questionToAdd.id);
                console.log(`Adding a potentially repeated (from last game, not used in guarantee phase) question to fill quota: ${questionToAdd.id}`);
            }
        }
    }

    console.log(`Total questions selected before final slice: ${selectedQuestions.length}`);

    if (selectedQuestions.length < QUESTIONS_PER_GAME) {
        console.warn(`Could not select ${QUESTIONS_PER_GAME} questions. Selected only ${selectedQuestions.length}. Game will be shorter.`);
        // Si es menor que el mínimo absoluto requerido (ej. el total de preguntas garantizadas por unidad)
        if (selectedQuestions.length < TOTAL_UNITS * MIN_QUESTIONS_PER_UNIT_REPRESENTATION) {
             errorMessageContainer.textContent = "No se pudieron seleccionar suficientes preguntas variadas para la partida.";
             console.error("CRITICAL: Selected questions count is less than the sum of minimums per unit.");
             return null;
        }
    }

    // 3. Mezcla final y asegurar el número exacto de preguntas
    shuffleArray(selectedQuestions);
    const finalGameQuestions = selectedQuestions.slice(0, QUESTIONS_PER_GAME);
    console.log("Final selected questions for game:", finalGameQuestions.map(q => q.id));

    if (finalGameQuestions.length < QUESTIONS_PER_GAME && allQuestions.length >= QUESTIONS_PER_GAME) {
         console.warn(`The game will have ${finalGameQuestions.length} questions, less than the desired ${QUESTIONS_PER_GAME}, despite having enough total questions. Check selection logic if this is frequent.`);
    }


    return finalGameQuestions;
}


/**
 * Inicia el juego.
 */
function startGame() {
    console.log("Attempting to start game...");
    startGameBtn.disabled = true; // Prevenir múltiples clics

    if (!checkQuestionAvailability()) {
        startGameBtn.disabled = false; // Re-habilitar si falla
        return;
    }

    currentQuestionsForGame = selectQuestionsForGame();

    if (!currentQuestionsForGame || currentQuestionsForGame.length === 0) {
        console.error("Failed to select questions for the game. currentQuestionsForGame is null or empty.");
        errorMessageContainer.textContent = "Error al seleccionar preguntas. Intenta de nuevo o verifica la consola.";
        startGameBtn.disabled = false;
        return;
    }
     // Si después de la selección, tenemos menos preguntas de las esperadas pero aún es jugable (ej. > 0)
    if (currentQuestionsForGame.length < QUESTIONS_PER_GAME) {
        console.warn(`Game starting with ${currentQuestionsForGame.length} questions instead of ${QUESTIONS_PER_GAME}.`);
        // Podríamos mostrar un mensaje al usuario o simplemente continuar.
        // Si es críticamente bajo (ej. menos de MIN_QUESTIONS_PER_UNIT_REPRESENTATION * TOTAL_UNITS), selectQuestionsForGame debería haber devuelto null.
        if (currentQuestionsForGame.length < 1) { // Si por alguna razón es 0
            errorMessageContainer.textContent = "No hay preguntas suficientes para esta partida.";
            startGameBtn.disabled = false;
            return;
        }
    }


    currentQuestionIndex = 0;
    score = { correct: 0, incorrect: 0 };
    // Actualizar lastGameQuestionIds con los IDs de la partida que está por comenzar
    lastGameQuestionIds = currentQuestionsForGame.map(q => q.id);

    console.log(`Starting game with ${currentQuestionsForGame.length} questions. IDs:`, currentQuestionsForGame.map(q=>q.id));

    startScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
    questionScreen.classList.remove('hidden');
    questionScreen.classList.remove('fade-out'); // Asegurar que no esté desvanecida
    questionScreen.classList.add('fade-in'); // Aplicar transición de entrada


    displayQuestion();
    updateScoreDisplay();
}

/**
 * Muestra la pregunta actual y sus opciones.
 */
function displayQuestion() {
    if (currentQuestionIndex >= currentQuestionsForGame.length) {
        endGame();
        return;
    }

    const question = currentQuestionsForGame[currentQuestionIndex];
    questionText.textContent = question.questionText;
    optionsContainer.innerHTML = ''; // Limpiar opciones anteriores

    // Barajar opciones si se desea (opcional)
    // const shuffledOptions = shuffleArray([...question.options]);
    // const correctAnswerText = question.options[question.correctAnswerIndex];

    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.textContent = option;
        button.classList.add('option-button', 'block', 'w-full', 'p-3', 'my-2', 'text-left', 'rounded-lg', 'border', 'border-slate-300', 'hover:bg-slate-200', 'focus:outline-none', 'focus:ring-2', 'focus:ring-sky-500', 'transition-colors', 'duration-150', 'ease-in-out');
        // Guardar el índice original para la comprobación, incluso si se barajan las opciones visualmente
        button.dataset.originalIndex = index;
        button.addEventListener('click', handleOptionClick);
        optionsContainer.appendChild(button);
    });

    feedbackText.textContent = '';
    explanationText.textContent = '';
    explanationText.classList.add('hidden');
    nextQuestionBtn.classList.add('hidden');
    updateQuestionCounter();
    console.log(`Displaying question ${currentQuestionIndex + 1}/${currentQuestionsForGame.length}: ${question.id}`);
}

/**
 * Maneja el clic en una opción de respuesta.
 * @param {Event} event - El evento de clic.
 */
function handleOptionClick(event) {
    const selectedButton = event.target.closest('.option-button'); // Asegurar que tomamos el botón
    if (!selectedButton) return;

    const selectedOriginalAnswerIndex = parseInt(selectedButton.dataset.originalIndex);
    const question = currentQuestionsForGame[currentQuestionIndex];

    // Deshabilitar todos los botones de opción
    Array.from(optionsContainer.children).forEach(button => {
        button.disabled = true;
        button.classList.add('opacity-60', 'cursor-not-allowed');
        button.classList.remove('hover:bg-slate-200', 'focus:ring-sky-500'); // Quitar efectos hover/focus
    });

    const isCorrect = selectedOriginalAnswerIndex === question.correctAnswerIndex;

    if (isCorrect) {
        score.correct++;
        feedbackText.textContent = "¡Respuesta Correcta!";
        feedbackText.className = 'text-md font-semibold mb-2 text-green-600';
        selectedButton.classList.remove('border-slate-300');
        selectedButton.classList.add('bg-green-500', 'text-white', 'border-green-600', 'ring-2', 'ring-green-300');
    } else {
        score.incorrect++;
        feedbackText.textContent = "Respuesta Incorrecta.";
        feedbackText.className = 'text-md font-semibold mb-2 text-red-600';
        selectedButton.classList.remove('border-slate-300');
        selectedButton.classList.add('bg-red-500', 'text-white', 'border-red-600', 'ring-2', 'ring-red-300');

        // Resaltar la respuesta correcta
        const correctButton = optionsContainer.querySelector(`[data-original-index="${question.correctAnswerIndex}"]`);
        if (correctButton) {
            correctButton.classList.remove('border-slate-300');
            correctButton.classList.add('bg-green-500', 'text-white', 'border-green-600', 'ring-2', 'ring-green-300');
        }
    }

    explanationText.innerHTML = `<strong>Explicación:</strong> ${question.explanation}`; // Usar innerHTML si la explicación puede tener formato
    explanationText.classList.remove('hidden');
    nextQuestionBtn.classList.remove('hidden');
    updateScoreDisplay();
    console.log(`Answered question ${question.id}. Correct: ${isCorrect}. Score: C-${score.correct} I-${score.incorrect}`);
}

/**
 * Actualiza el contador de preguntas en la pantalla.
 */
function updateQuestionCounter() {
    questionCounter.textContent = `Pregunta ${currentQuestionIndex + 1} / ${currentQuestionsForGame.length}`;
}

/**
 * Actualiza la puntuación en la pantalla.
 */
function updateScoreDisplay() {
    scoreCounter.textContent = `Aciertos: ${score.correct} | Fallos: ${score.incorrect}`;
}

/**
 * Avanza a la siguiente pregunta o finaliza el juego.
 */
function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuestionsForGame.length) {
        displayQuestion();
    } else {
        endGame();
    }
}

/**
 * Finaliza la partida y muestra la pantalla de resultados.
 */
function endGame() {
    console.log("Ending game. Final score:", score);
    questionScreen.classList.add('hidden');
    questionScreen.classList.remove('fade-in');
    questionScreen.classList.add('fade-out');


    endScreen.classList.remove('hidden');
    endScreen.classList.remove('fade-out');
    endScreen.classList.add('fade-in');

    correctAnswersFinal.textContent = score.correct;
    incorrectAnswersFinal.textContent = score.incorrect;
}

/**
 * Reinicia el juego para una nueva partida.
 */
function playAgain() {
    console.log("Play again clicked.");
    // lastGameQuestionIds ya contiene los IDs de la partida recién terminada.
    // startGame se encargará de usar esta información para la selección de nuevas preguntas.
    startGameBtn.disabled = false;
    endScreen.classList.add('hidden');
    endScreen.classList.remove('fade-in');
    endScreen.classList.add('fade-out');


    startScreen.classList.remove('hidden');
    startScreen.classList.remove('fade-out');
    startScreen.classList.add('fade-in');
    errorMessageContainer.textContent = ''; // Limpiar mensajes de error antiguos
}

/**
 * Inicializa los event listeners.
 */
function initializeEventListeners() {
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            // No deshabilitar aquí, startGame lo hará si todo va bien
            startGame();
        });
    } else {
        console.error("Start game button not found!");
    }

    if (nextQuestionBtn) {
        nextQuestionBtn.addEventListener('click', nextQuestion);
    } else {
        console.error("Next question button not found!");
    }

    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', playAgain);
    } else {
        console.error("Play again button not found!");
    }
    console.log("Event listeners initialized.");
}


// --- INICIALIZACIÓN DEL JUEGO ---
document.addEventListener('DOMContentLoaded', async () => {
    assignDOMelements();

    const questionsLoaded = await loadAllQuestions();

    if (questionsLoaded) {
        if (!checkQuestionAvailability()) {
            console.warn("Initial check: Not enough questions to play reliably.");
            if(startGameBtn) startGameBtn.disabled = true; // Deshabilitar si no hay suficientes preguntas
            // El mensaje de error ya se muestra dentro de checkQuestionAvailability
        } else {
             console.log("Initial check: Sufficient questions available.");
             if(startGameBtn) startGameBtn.disabled = false; // Habilitar si hay suficientes
        }
    } else {
        // errorMessageContainer ya habrá sido actualizado por loadAllQuestions
        if(startGameBtn) startGameBtn.disabled = true;
    }

    initializeEventListeners();

    // Asegurar que solo la pantalla de inicio sea visible y las otras ocultas
    if (questionScreen) questionScreen.classList.add('hidden');
    if (endScreen) endScreen.classList.add('hidden');
    if (startScreen) {
        startScreen.classList.remove('hidden');
        startScreen.classList.remove('fade-out'); // Asegurar que no esté desvanecida
        startScreen.classList.add('fade-in'); // Aplicar transición de entrada
    }


    console.log("Game initialized. Waiting for user to start.");
});
