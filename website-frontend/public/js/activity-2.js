/* -------------- Initialize variables -------------- */
var recordButton;
var recordBtnCurrHandler; // Reference so we can remove/replace handler depending on curranimal
var zhoraiTextColour = "#5d3e9f";
var animalPromptLabel;
var zhoraiSpeechBox;
var loadingGif;
var currBtnIsMic = true;
var mindmapPath = "../../website-backend/receive-text/data/mindmap.txt";
var currentAnimal = "";
var translatedAnimal = "";
var knownAnimals = [
    ['bees', 'bijen'],
    ['birds', 'vogels'],
    // ['butterflies', 'vlinders'],
    // ['leopards', 'luipaarden'],
    ['cows', 'koeien'],
    // ['owls', 'uilen'],
    // ['fireflies', 'vuurvliegjes'],
    ['dolphins', 'dolfijnen'],
    ['fish', 'vissen'],
    // ['lobsters', 'kreeften'],
    // ['starfish', 'zeesterren'],
    // ['swordfish', 'zwaardvis'],
    ['whales', 'walvissen'],
    ['polarbears', 'ijsberen'],
    // ['arcticfoxes', 'poolvossen'],
    // ['yaks', 'jakken'],
    ['reindeer', 'rendieren'],
    ['camels', 'kamelen'],
    // ['scorpions', 'schorpioenen'],
    // ['elephants', 'olifanten'],
    // ['giraffes', 'giraffen'],
    ['lions', 'leeuwen']
];
var oldAnimals = [];
var sm = null; // sentence manager

// File paths for saving animal info
var animalDir = 'animals/';

/* -------------- Initialize functions -------------- */
function showPurpleText(text) {
    zhoraiSpeechBox.innerHTML = '<p style="color:' + zhoraiTextColour + '">' + text + '</p>';
}

/**
 * Replaces "Zhorai" with "Zor-eye":
 * @param {*} text
 */
function makePhonetic(text) {
    text = text.replace(/Zhorai/gi, 'Zor-eye');
    text = text.replace(/Zorai/gi, 'Zor-eye');
    text = text.replace(/Zohrai/gi, 'Zor-eye');
    text = text.replace(/Zoreye/gi, 'Zor-eye');
    return text;
}

/**
 * Returns list of english voices:
 */
function getEnglishVoices() {
    englishVoices = [];
    speechSynthesis.getVoices().forEach(function (voice) {
        if (voice.lang.includes("en")) {
            englishVoices.push(voice);
        }
    });
    return englishVoices;
}

/**
 * Switches the button to the specified button (either 'micBtn' or 'speakBtn')
 * @param {*} toButton
 */
function switchButtonTo(toButton) {
    if (toButton == 'micBtn') {
        recordButton.hidden = false;
        loadingGif.hidden = true;
        textFileBtn.hidden = true;
        currBtnIsMic = true;
    } else if (toButton == 'speakBtn') {
        recordButton.hidden = true;
        loadingGif.hidden = true;
        textFileBtn.hidden = true;
        currBtnIsMic = false;
    } else if (toButton == 'loading') {
        loadingGif.hidden = false;
        recordButton.hidden = true;
        textFileBtn.hidden = true;
        currBtnIsMic = false;
    } else if (toButton == 'textFileBtn') {
        textFileBtn.hidden = false;
        loadingGif.hidden = true;
        recordButton.hidden = true;
        currBtnIsMic = false;
    } else if (toButton == 'micAndTextFileBtn') {
        textFileBtn.hidden = false;
        recordButton.hidden = false;
        loadingGif.hidden = true;
        currBtnIsMic = true;
    } else if (!toButton) {
        console.log('No button specified. Not switching button.');
    } else {
        console.error('Unknown button: ' + toButton + '. Did not switch button.');
    }
}

async function mod2ReceiveData(filedata) {
    // Check to see if there was a hangup because of a bad sentence
    if (filedata.includes("BAD ENGLISH")) {
        // one of the sentences entered was confusing english... have to redo :(
        var phrases = ['Een van die zinnen begreep ik niet en ik vergat de rest van wat je zei! Kun je me alsjeblieft opnieuw leren over ' + translatedAnimal + '?',
            'Het spijt me, ik raakte in de war tijdens wat je zei. Kun je me alsjeblieft opnieuw leren over ' + translatedAnimal + '?',
            'Oeps, ik raakte in de war door iets dat je zei en vergat alles over ' + translatedAnimal + '! Kun je alsjeblieft opnieuw met me praten over ' + translatedAnimal + '?'
        ];
        var toSpeak = chooseRandomPhrase(phrases);
        showPurpleText(toSpeak);
        speakText(toSpeak);

        switchButtonTo('micAndTextFileBtn');
    } else if (filedata.includes("ERR_NO_TEXT")) {
        // There were no sentences saved for this animal... Let the user know:
        var phrases = ['Hmm, ik weet eigenlijk nog niets over ' + translatedAnimal + '. Kun je me alsjeblieft erover leren?',
            'Ik heb nog niets geleerd over ' + translatedAnimal + ', eigenlijk! Wat weet jij erover?',
            'Oeps! Ik weet niets over ' + translatedAnimal + '. Kun je me alsjeblieft wat dingen erover leren?'
        ];
        var toSpeak = chooseRandomPhrase(phrases);
        showPurpleText(toSpeak);
        speakText(toSpeak);

        switchButtonTo('micAndTextFileBtn');
    } else {
        // We're done parsing and reading the mindmap text file!
        // create the mindmap!
        console.log('Creating mindmap! filedata:');
        filedata = filedata.replace(/'/g, '"');
        console.log(filedata);
        console.log(JSON.parse(filedata));

        switchButtonTo('micAndTextFileBtn');
        createMindmap(JSON.parse(filedata));

        // Now let's teach zhorai about another animal :)
        // todo: get rid of oldAnimals
        // Add the current animal to the list of oldAnimals:
        // oldAnimals.push(currentAnimal);
        // currentAnimal = chooseRandomPhrase(knownAnimals.filter(checkNewAnimal));
        // Choose a random entry from knownAnimals and use its English name (first element)
        var idx = Math.floor(Math.random() * knownAnimals.length);
        animalarray = knownAnimals[idx];
        currentAnimal = animalarray[0];
        translatedAnimal = animalarray[1];

        // update the prompt and sentences with the new animal
        setAnimalPrompt(currentAnimal);
        console.log('Next animal: ' + currentAnimal, "translated: " + translatedAnimal);
        sm.setDivToSessionSentences(currentAnimal);
    }
}

function checkNewAnimal(animal) {
    return !(oldAnimals.includes(animal));
}

function setAnimalPrompt() {
    animalPromptLabel.innerHTML = "Zhorai wil graag meer leren over <span style=\"text-decoration: underline;\">" +
        translatedAnimal + "</span>. Kun je het daarover leren?";
    textFileLabel.innerHTML = "Als je klaar bent met het leren van Zhorai over " +
        translatedAnimal + ", klik dan op de knop hieronder.";
}

/* -------------- Once the page has loaded -------------- */
document.addEventListener('DOMContentLoaded', async function () {
    // Initialize variables:
    currStage = 0;
    animalPromptLabel = document.getElementById('animalPromptLabel');
    recordButton = document.getElementById('record_button');
    zhoraiSpeechBox = document.getElementById('final_span');
    loadingGif = document.getElementById('loadingGif');
    textFileLabel = document.getElementById('textFileLabel');
    textFileBtn = document.getElementById('textFileBtn');
    var idx = Math.floor(Math.random() * knownAnimals.length);
    animalarray = knownAnimals[idx];
    console.log(animalarray);
    currentAnimal = animalarray[0];
    translatedAnimal = animalarray[1];
    console.log('Next animal: ' + currentAnimal, "translated: " + translatedAnimal);

    // Restart speech synthesizer:
    // (see https://stackoverflow.com/a/58775876/8162699)
    window.speechSynthesis.cancel();

    setAnimalPrompt();

    // Create sentence manager and put all known sentences about the current animal on the page
    sm = new SentenceManager(document.getElementById("sentencesDiv"), "./img/x_del.svg");
    // Add all sentences in memory to page:
    sm.setDivToSessionSentences(currentAnimal);

    // Add click handlers
    setUpRecordingHandlers(record_button, function () {
        recordButtonClick({
            key: currentAnimal,
            sentenceManager: sm
        });
    });
    textFileBtn.addEventListener('click', function () {
        switchButtonTo('loading');
        // say something about how we're going to display Zhorai's thoughts after parsing
        var phrases = ['Bedankt voor het leren over ' + translatedAnimal + '! Laat me nadenken over al deze nieuwe dingen en ik laat je mijn gedachten zien.',
            "Wauw, " + translatedAnimal + " klinkt echt interessant! Laat me even nadenken en dan laat ik je mijn gedachten zien.",
            translatedAnimal + " klinkt fascinerend! Nu wil ik de aarde en al het leven daarop bezoeken! Ik laat je zien wat ik begrijp nadat ik even heb nagedacht."
        ];
        var toSpeak = chooseRandomPhrase(phrases);
        showPurpleText(toSpeak);
        speakText(toSpeak);

        // delete the current mindmap to prepare for the next
        deleteMindmap();

        // send a command to the server to parse what's in the session memory,
        parseSession('Mindmap', currentAnimal, 'parsing' + '_mod2');
        // when done parsing, create the mind map (in mod2ReceiveData)
    });
});