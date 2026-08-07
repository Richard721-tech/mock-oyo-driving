document.addEventListener('DOMContentLoaded', () => {
    // State variables
    let currentQuestions = [];
    let currentQuestionIndex = 0;
    let selectedAnswers = {};
    let visitedQuestions = new Set();
    let missedTopics = new Map(); // topic -> recommendation
    let timerInterval;
    const TEST_DURATION = 30 * 60; // 30 minutes in seconds
    const PASS_MARK = 60; // percent
    let timeRemaining = TEST_DURATION;

    // Auto-updating footer year
    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // DOM Elements
    const landingScreen = document.getElementById('landing-screen');
    const testScreen = document.getElementById('test-screen');
    const resultScreen = document.getElementById('result-screen');
    
    const startBtn = document.getElementById('start-btn');
    const categoryRadios = document.getElementsByName('category');
    
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');
    const questionCounter = document.getElementById('question-counter');
    const questionNavigator = document.getElementById('question-navigator');
    const progressFill = document.getElementById('progress-fill');
    const timeLeftDisplay = document.getElementById('time-left');
    const timerContainer = document.querySelector('.timer');

    // Utility to shuffle an array
    function shuffleArray(array) {
        let currentIndex = array.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    }

    function getSelectedCategory() {
        for (const radio of categoryRadios) {
            if (radio.checked) return radio.value;
        }
        return 'car';
    }

    function startTest(fromScreen) {
        const selectedCategory = getSelectedCategory();

        // Load questions based on category
        const pool = selectedCategory === 'car' ? carQuestions : trailerQuestions;

        // Enforce 40% quota for Road Signs (16 out of 40)
        const roadSignsPool = pool.filter(q => q.topic === "Road Signs");
        const othersPool = pool.filter(q => q.topic !== "Road Signs");

        const selectedRoadSigns = shuffleArray([...roadSignsPool]).slice(0, 16);
        const selectedOthers = shuffleArray([...othersPool]).slice(0, 24);

        // Combine and shuffle the final 40 questions
        currentQuestions = shuffleArray([...selectedRoadSigns, ...selectedOthers]);

        // Reset state
        currentQuestionIndex = 0;
        selectedAnswers = {};
        visitedQuestions.clear();
        missedTopics.clear();
        timeRemaining = TEST_DURATION;
        timerContainer.classList.remove('warning');

        switchScreen(fromScreen, testScreen);
        startTimer();
        generateNavigator();
        loadQuestion();
    }

    startBtn.addEventListener('click', () => startTest(landingScreen));

    function generateNavigator() {
        questionNavigator.innerHTML = '';
        currentQuestions.forEach((_, index) => {
            const btn = document.createElement('button');
            btn.className = 'nav-btn';
            btn.textContent = index + 1;
            btn.onclick = () => {
                currentQuestionIndex = index;
                loadQuestion();
            };
            questionNavigator.appendChild(btn);
        });
    }

    // Reflect answered / skipped / active states on the navigator buttons
    function refreshNavigator() {
        document.querySelectorAll('.nav-btn').forEach((btn, idx) => {
            btn.classList.toggle('active', idx === currentQuestionIndex);
            btn.classList.toggle('answered', selectedAnswers[idx] !== undefined);
            btn.classList.toggle('skipped',
                selectedAnswers[idx] === undefined &&
                visitedQuestions.has(idx) &&
                idx !== currentQuestionIndex);
        });
    }

    function switchScreen(from, to) {
        from.classList.remove('active');
        to.classList.add('active');
    }

    function startTimer() {
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            timeRemaining--;
            updateTimerDisplay();
            
            if (timeRemaining <= 300) { // Less than 5 minutes
                timerContainer.classList.add('warning');
            }

            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                submitTest();
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        timeLeftDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    const questionImageContainer = document.getElementById('question-image-container');

    function loadQuestion() {
        const q = currentQuestions[currentQuestionIndex];
        questionText.textContent = q.question;
        
        // Handle diagram/image rendering
        if (q.image) {
            questionImageContainer.style.display = 'flex';
            questionImageContainer.innerHTML = q.image;
        } else {
            questionImageContainer.style.display = 'none';
            questionImageContainer.innerHTML = '';
        }
        
        visitedQuestions.add(currentQuestionIndex);

        // Update counters and progress
        questionCounter.textContent = `Question ${currentQuestionIndex + 1} of ${currentQuestions.length}`;
        const progressPercentage = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
        progressFill.style.width = `${progressPercentage}%`;

        refreshNavigator();

        // Load options
        optionsContainer.innerHTML = '';
        
        // Shuffle options for this question
        let options = shuffleArray([...q.options]);
        const labels = ['A', 'B', 'C', 'D'];

        options.forEach((opt, index) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            
            // Check if this was previously selected
            if (selectedAnswers[currentQuestionIndex] === opt) {
                btn.classList.add('selected');
            }

            btn.innerHTML = `<span class="option-marker">${labels[index]}</span>${opt}`;
            
            btn.onclick = () => {
                // Remove selected class from all
                document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                // Add to current
                btn.classList.add('selected');
                // Save answer
                selectedAnswers[currentQuestionIndex] = opt;
                refreshNavigator();
            };
            
            optionsContainer.appendChild(btn);
        });

        // Update navigation buttons
        prevBtn.disabled = currentQuestionIndex === 0;
        
        if (currentQuestionIndex === currentQuestions.length - 1) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'inline-block';
        } else {
            nextBtn.style.display = 'inline-block';
            submitBtn.style.display = 'none';
        }
    }

    prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            loadQuestion();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentQuestionIndex < currentQuestions.length - 1) {
            currentQuestionIndex++;
            loadQuestion();
        }
    });

    submitBtn.addEventListener('click', () => {
        if(confirm("Are you sure you want to submit your test?")) {
            clearInterval(timerInterval);
            submitTest();
        }
    });

    function submitTest() {
        let correct = 0, wrong = 0, unanswered = 0;
        missedTopics.clear();

        currentQuestions.forEach((q, index) => {
            const userAnswer = selectedAnswers[index];
            if (userAnswer === q.answer) {
                correct++;
            } else {
                if (userAnswer === undefined) unanswered++;
                else wrong++;
                // If wrong or unanswered, add the topic to the missed list
                if (!missedTopics.has(q.topic)) {
                    missedTopics.set(q.topic, q.recommendation);
                }
            }
        });

        const percentage = Math.round((correct / currentQuestions.length) * 100);
        showResults(percentage, { correct, wrong, unanswered });
    }

    function launchConfetti() {
        const colors = ['#60a5fa', '#a78bfa', '#f472b6', '#10b981', '#f59e0b'];
        for (let i = 0; i < 80; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = `${Math.random() * 100}vw`;
            piece.style.background = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDelay = `${Math.random() * 1.5}s`;
            piece.style.transform = `rotate(${Math.random() * 360}deg)`;
            document.body.appendChild(piece);
            setTimeout(() => piece.remove(), 5000);
        }
    }

    function renderAnswerReview() {
        const container = document.getElementById('answer-review');
        container.innerHTML = '';

        currentQuestions.forEach((q, index) => {
            const userAnswer = selectedAnswers[index];
            if (userAnswer === q.answer) return; // only show questions that need attention

            const item = document.createElement('div');
            item.className = 'review-question';

            let answerHTML;
            if (userAnswer === undefined) {
                answerHTML = `<div class="rq-answer skipped">⏭️ Skipped — Correct answer: <strong>${q.answer}</strong></div>`;
            } else {
                answerHTML = `
                    <div class="rq-answer wrong">✖ Your answer: <strong>${userAnswer}</strong></div>
                    <div class="rq-answer correct">✔ Correct answer: <strong>${q.answer}</strong></div>`;
            }

            item.innerHTML = `
                <div class="rq-number">Question ${index + 1} · ${q.topic}</div>
                <div class="rq-text">${q.question}</div>
                ${answerHTML}`;
            container.appendChild(item);
        });

        if (!container.children.length) {
            container.innerHTML = '<div class="review-note"><span class="icon">🎉</span><div>You answered every question correctly — nothing to review!</div></div>';
        }
    }

    function showResults(percentage, breakdown) {
        switchScreen(testScreen, resultScreen);
        
        const scorePercentage = document.getElementById('score-percentage');
        const scoreCircle = document.getElementById('score-circle');
        const scoreMessage = document.getElementById('score-message');
        const reviewNotesContainer = document.getElementById('review-notes');

        scorePercentage.textContent = `${percentage}%`;

        // Fill in the correct / wrong / skipped breakdown
        document.getElementById('correct-count').textContent = breakdown.correct;
        document.getElementById('wrong-count').textContent = breakdown.wrong;
        document.getElementById('unanswered-count').textContent = breakdown.unanswered;

        // Calculate stroke dasharray for the circular progress (max is 100)
        setTimeout(() => {
            scoreCircle.style.strokeDasharray = `${percentage}, 100`;
        }, 100);

        if (percentage >= PASS_MARK) {
            scoreCircle.style.stroke = 'var(--success)';
            scorePercentage.style.color = 'var(--success)';
            scoreMessage.textContent = "Congratulations! You passed the mock CBT test.";
            scoreMessage.style.color = 'var(--success)';
            launchConfetti();
        } else {
            scoreCircle.style.stroke = 'var(--danger)';
            scorePercentage.style.color = 'var(--danger)';
            scoreMessage.textContent = "You did not meet the passing score (60%). Please review the topics below.";
            scoreMessage.style.color = 'var(--danger)';
        }

        // Render Review Notes
        reviewNotesContainer.innerHTML = '';
        if (missedTopics.size === 0) {
            reviewNotesContainer.innerHTML = '<div class="review-note"><span class="icon">🌟</span><div>Perfect score! You have an excellent grasp of all topics.</div></div>';
        } else {
            missedTopics.forEach((recommendation, topic) => {
                const noteEl = document.createElement('div');
                noteEl.className = 'review-note';
                noteEl.innerHTML = `
                    <span class="icon">💡</span>
                    <div>
                        <strong>${topic}:</strong> ${recommendation}
                    </div>
                `;
                reviewNotesContainer.appendChild(noteEl);
            });
        }

        renderAnswerReview();
    }

    // Keyboard shortcuts (active only during the test)
    document.addEventListener('keydown', (e) => {
        if (!testScreen.classList.contains('active')) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key === 'ArrowRight' && currentQuestionIndex < currentQuestions.length - 1) {
            currentQuestionIndex++;
            loadQuestion();
        } else if (e.key === 'ArrowLeft' && currentQuestionIndex > 0) {
            currentQuestionIndex--;
            loadQuestion();
        } else {
            const optionIndex = ['a', 'b', 'c', 'd'].indexOf(e.key.toLowerCase());
            if (optionIndex !== -1) {
                const optionBtns = optionsContainer.querySelectorAll('.option-btn');
                if (optionBtns[optionIndex]) optionBtns[optionIndex].click();
            }
        }
    });

    // Back to home
    document.getElementById('restart-btn').addEventListener('click', () => {
        timerContainer.classList.remove('warning');
        switchScreen(resultScreen, landingScreen);
        document.getElementById('score-circle').style.strokeDasharray = '0, 100';
    });

    // Retake a fresh test in the same category straight from the results screen
    document.getElementById('retake-btn').addEventListener('click', () => {
        document.getElementById('score-circle').style.strokeDasharray = '0, 100';
        startTest(resultScreen);
    });
});
