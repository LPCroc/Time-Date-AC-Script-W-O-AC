
// Call with lookBack 0 to read the most recent action in history (or n many actions back)
// CREDITS TO LEWDLEAH FOR THIS!
function readPastAction(lookBack) {
    const action = (function () {
        if (Array.isArray(history)) {
            return (history[(function () {
                const index = history.length - 1 - Math.abs(lookBack);
                if (index < 0) {
                    return 0;
                } else {
                    return index;
                }
            })()]);
        } else {
            return {};
        }
    })();
    return {
        text: action.text ?? (action.rawText ?? ""),
        type: action.type ?? "unknown"
    };
}

const CommunityUtils = {
    Actions: {
        // Checks whether the last actions had any user input, if so then returns true.
        wasRetry: function () {
            if (state._communityUtils_wasInput || readPastAction(0).type == "continue") {
                state._communityUtils_wasInput = false;
                return false;
            }
            return true;
        }
    },
    StoryCards: {
        // Tries to find a story card, can create one if not found.
        // `name`: the name of the story card.
        // `createIfNotFound`: pretty self-explanatory, creates a card if true and not found.
        // `entry`: the entry of the story card (only used during creation).
        // `category`: the category of the story card (only used during creation).
        find: function (name, createIfNotFound = false, entry = "Imagine a very interesting entry here.", category = "Uncategorized") {
            // This below checks if there is a valid cache in which to save card identifiers.
            if (!state._communityUtils_cardCache) state._communityUtils_cardCache = {};

            // Try to find a cached card approach.
            const cachedCardId = state._communityUtils_cardCache[name];

            // If a cached card is found.
            if (cachedCardId) {
                // Try to find the card which matches the specific identifier.
                const cardFromCache = storyCards.find(card => card.id === cachedCardId);

                // Either way return the valid card.
                if (cardFromCache) return cardFromCache;
                else delete state._communityUtils_cardCache[name]; // Or the card is invalid and not found, which means it was deleted by the user or something.
            }

            // If here then the card was never cached and saved.
            // In that case loop over all the cards and find it based on name.
            for (const card of storyCards) {
                // Check if the keys include whatever the name is, since that is most often used anyways.
                // Using the title is also valid but the scripting API lacks that cute little tidbit, so this is fine for now.
                if (card.keys.includes(name)) {
                    state._communityUtils_cardCache[name] = card.id; // If we find a card by name then cache its identifier.
                    return card // Return the discovered card.
                }
            }

            // If here then the card wasn't ever cached or even found.
            // In that case simply check if card creation is enabled, if so then create card.
            if (createIfNotFound) {
                const newIndex = addStoryCard(name, entry, category); // Create a card and receive its index.
                const newCard = storyCards[newIndex - 1]; // For some reason the index starts at one (so that is why one is subtracted in order to get the right card).
                return newCard; // Return the newly created card.
            }

            // If returning here, then no card was ever found or cached and creation was disabled.
            // Which is why `null` is returned.
            return null;
        },
        // Safely reads all settings from a story card, if the value wasn't found then the default value is returned.
        // `storyCard`: the reference to the story card object to read from.
        // `settingName`: the name of the setting (ex. Number of Actions, Time, Whatever).
        // `defaultValue`: the default value which is returned if the setting was NOT found in the card.
        readSettings(storyCard, settingName, defaultValue) {
            const regex = new RegExp(`^>\\s*${settingName}:\\s*(.+)`, 'm'); // Try to find all settings because they start with a `>` such as: `> Action Count: XYZ`.
            const match = storyCard.entry.match(regex); // Read the entry from the story card.

            // If the setting could not be found or anything else is wonky, then return the default value.
            if (!match || typeof match[1] !== 'string') return defaultValue;

            // Otherwise trim it to get the real value.
            const value = match[1].trim();

            // These below are for boolean settings.
            if (value.toLowerCase() === 'true') return true;
            if (value.toLowerCase() === 'false') return false;

            // These below are for numerical/floating-point values.
            const num = parseFloat(value);
            if (!isNaN(num) && isFinite(value)) return num;

            // Return the discovered value.
            return value;
        },
        // Sets a specific setting in the story card to a desired value.
        // `storyCard`: the reference to the story card object which needs to be modified.
        // `settingName`: the name of the setting (ex. Number of Actions, Time, Whatever).
        // `newValue`: the new value to assign to the setting.
        setSettings: function (storyCard, settingName, newValue) {
            // Safety measures, stops if something is wrong with the story card.
            if (!storyCard || typeof storyCard.entry !== 'string') return;

            // Find the settings again.
            const regex = new RegExp(`^>\\s*${settingName}:\\s*(.+)`, 'm');
            const settingLine = `> ${settingName}: ${newValue}`; // Set the correct line.
            let newEntry; // Assign the new entry value here.

            // Replace the contents of the entry.
            if (regex.test(storyCard.entry)) newEntry = storyCard.entry.replace(regex, settingLine);
            else newEntry = storyCard.entry.trim() + `\n${settingLine}`;

            try {
                const cardIndex = storyCards.findIndex(card => card.id === storyCard.id); // Try to find the correct card.
                if (cardIndex !== -1) { // If the card was indeed found.
                    updateStoryCard(cardIndex, storyCard.keys, newEntry, storyCard.type, storyCard.title, storyCard.description); // Then update it.
                    storyCard.entry = newEntry; // Just in case the new `updateStoryCard` function gets wonky in the future.
                } else {
                    console.error(`Some very handy error here: "${storyCard.title}".`); // Throw an error if something is wrong with the SC.
                }
            } catch (e) {
                console.error(`Some very handy error here: ${e}`); // If this ever gets wrong then something is seriously off, here be dragons.
            }
        }
    }
}

const TimeAndDay = {
    Functions: {
        // Reads the last input and checks if that is a special command.
        // Ex. `you go to sleep -> set nextday`.
        applyCommandTime: function (lastInput, storyCard) {
            if (!lastInput || !storyCard || !storyCard.description) return;
            for (const line of storyCard.description.split('\n')) {
                const parts = line.split('->');
                if (parts.length !== 2) continue;
                const commandPhrase = parts[0].trim().replace(/^"|"$/g, '');
                const actionStr = parts[1].trim();
                if (lastInput.toLowerCase().includes(commandPhrase.toLowerCase())) {
                    if (actionStr.startsWith('add')) {
                        const daysMatch = actionStr.match(/(\d+)\s*d/);
                        const hoursMatch = actionStr.match(/(\d+)\s*h/);
                        const minutesMatch = actionStr.match(/(\d+)\s*m/);
                        if (daysMatch) state._timeOfDay_day += parseInt(daysMatch[1], 10);
                        if (hoursMatch) state._timeOfDay_hour += parseInt(hoursMatch[1], 10);
                        if (minutesMatch) state._timeOfDay_minute += parseInt(minutesMatch[1], 10);
                    } else if (actionStr.startsWith('set')) {
                        const timeMatch = actionStr.match(/(\d{1,2}):(\d{2})/);
                        if (timeMatch) {
                            state._timeOfDay_hour = parseInt(timeMatch[1], 10);
                            state._timeOfDay_minute = parseInt(timeMatch[2], 10);
                            if (actionStr.includes('nextday')) {
                                state._timeOfDay_day += 1;
                            }
                        }
                    }
                    break;
                }
            }
        },
        // Advances time every action, so if the `Minutes Per Action` is set to `10` it skips 10 minutes into the future.
        advanceStandardTime: function (storyCard) {
            if (!storyCard) return; // Safety measure in case the story cards is wonky and gone.
            const minutesPerAction = Math.max(0, CommunityUtils.StoryCards.readSettings(storyCard, "Minutes Per Action", 10)); // Get the current minutes per action and ensure it is always positive.
            state._timeOfDay_minute += minutesPerAction; // Increment the current minute counter.
        },
        // Normalizes the time so that minutes can never exceed 60 and hours can never exceed 24.
        normalizeTime: function () {
            // Applies all the correct minutes.
            while (state._timeOfDay_minute >= 60) {
                state._timeOfDay_minute -= 60;
                state._timeOfDay_hour += 1;
            }

            // Applies all the correct hours.
            while (state._timeOfDay_hour >= 24) {
                state._timeOfDay_hour -= 24;
                state._timeOfDay_day += 1;
            }
        },
        // Updates the [Time: HH:MM (PHASE), Day #: DD] format such as [Time: 01:30 (Night), Day #: 2].
        updateDerivedTimeState: function () {
            const hour = state._timeOfDay_hour; // Get the current hour.
            let phase = 'Night'; // Set the initial phase to `Night`.
            if (hour >= 6 && hour < 12) phase = 'Morning'; // This is the range which is considered morning.
            else if (hour >= 12 && hour < 17) phase = 'Afternoon'; // This is the range which is considered afternoon.
            else if (hour >= 17 && hour < 20) phase = 'Evening'; // This is the range which is considered evening.

            // Set the current phase.
            state._timeOfDay_phase = phase;
            state._timeOfDay_hourStr = String(hour).padStart(2, '0'); // Convert the current hour to a string.
            state._timeOfDay_minuteStr = String(state._timeOfDay_minute).padStart(2, '0'); // Convert the current minute to a string.
        },
        // If this is called then it sets `state.message` to the current DD:HH:MM format.
        updateStateMessage: function () {
            if (state._timeOfDay_showStateMessage) {
                state.message = `Day ${state._timeOfDay_day}, ${state._timeOfDay_hourStr}:${state._timeOfDay_minuteStr}`;
            }
        },
        // This saves the current minute, hour, and day to the `Time & Day Settings` story card.
        saveTimeToCard: function (storyCard) {
            if (!storyCard) return;
            CommunityUtils.StoryCards.setSettings(storyCard, "Minute", state._timeOfDay_minute);
            CommunityUtils.StoryCards.setSettings(storyCard, "Hour", state._timeOfDay_hour);
            CommunityUtils.StoryCards.setSettings(storyCard, "Day", state._timeOfDay_day);
        },
        // This applies the current [Time: HH:MM (PHASE), Day #: DD] to the context, so the AI is always aware of what time it is.
        formatContext: function (text, storyCard) {
            if (storyCard && CommunityUtils.StoryCards.readSettings(storyCard, "Enabled", true)) {
                const timeData = `Day: ${state._timeOfDay_day}, Time: ${state._timeOfDay_hourStr}:${state._timeOfDay_minuteStr}, Phase: ${state._timeOfDay_phase}`;
                return text + `\n\n[Use this timing information: ${timeData}]`; // This just appends it all the way below context, could probably also put it into the AN. Need to test.
            }
            return text;
        },
        // This append [Time: HH:MM (PHASE), Day #: DD] to the Output, only if the `> Show Time` option is set to true.
        formatOutput: function (text, storyCard) {
            if (storyCard && state._timeOfDay_showTime) {
                return text + `\n\n[Time: ${state._timeOfDay_hourStr}:${state._timeOfDay_minuteStr} (${state._timeOfDay_phase}), Day #: ${state._timeOfDay_day}]`;
            }
            return text;
        }
    },
    Hooks: {
        // This is called during the input hook. It pretty much goes over all the settings, creates the settings card if not there, and sets all the correct values in state.
        onInput: function (text) {
            // Set some flags and text values we receive from input.
            state._communityUtils_wasInput = true; // This is used to determine whether the action time skip should be in-effect.
            state._timeOfDay_lastInputText = text;

            // Currently do not modify the input stuff.
            return text;
        },
        onContext: function (text) {
            // These are the initial settings which are assigned when the T&D story card is created.
            let settingsEntry = "Time Settings:\n> Enabled: true\n> Show Time: true\n> Show State Message: false\n> Hour: 8\n> Minute: 0\n> Day: 1\n\nAction Settings:\n> Minutes Per Action: 10";
            // This tries to find the current settings story card and creates it if not found.
            let settingsStoryCard = CommunityUtils.StoryCards.find("Time & Day Settings", true, settingsEntry, "Settings");

            // This overrides and replaces the settings story card's description, only if it is empty though.
            // You can edit or replace the starting commands here.
            if (!settingsStoryCard.description) settingsStoryCard.description = '"go to sleep" -> set 8:00 nextday\n"rest a bit" -> add 4h\n"fly to the moon" -> add 16h 30m';

            // This copies all the boolean settings from the settings story card.
            state._timeOfDay_enabled = CommunityUtils.StoryCards.readSettings(settingsStoryCard, "Enabled", true);
            state._timeOfDay_showTime = CommunityUtils.StoryCards.readSettings(settingsStoryCard, "Show Time", true);
            state._timeOfDay_showStateMessage = CommunityUtils.StoryCards.readSettings(settingsStoryCard, "Show State Message", true);

            // This copies all the timing information from the settings story card.
            state._timeOfDay_minute = Math.max(0, CommunityUtils.StoryCards.readSettings(settingsStoryCard, "Minute", 0));
            state._timeOfDay_hour = Math.max(0, CommunityUtils.StoryCards.readSettings(settingsStoryCard, "Hour", 8));
            state._timeOfDay_day = Math.max(1, CommunityUtils.StoryCards.readSettings(settingsStoryCard, "Day", 1));

            if (!CommunityUtils.Actions.wasRetry()) {
                TimeAndDay.Functions.applyCommandTime(state._timeOfDay_lastInputText, settingsStoryCard);
                TimeAndDay.Functions.advanceStandardTime(settingsStoryCard);
                TimeAndDay.Functions.normalizeTime();
                TimeAndDay.Functions.updateDerivedTimeState();
                TimeAndDay.Functions.saveTimeToCard(settingsStoryCard);
            } else {
                TimeAndDay.Functions.updateDerivedTimeState();
            }

            return TimeAndDay.Functions.formatContext(text, settingsStoryCard);
        },
        onOutput: function (text) {
            if (!CommunityUtils.Actions.wasRetry()) {
                TimeAndDay.Functions.updateStateMessage();
            }
            const settingsStoryCard = CommunityUtils.StoryCards.find("Time & Day Settings");
            return TimeAndDay.Functions.formatOutput(text, settingsStoryCard);
        }
    }
}
