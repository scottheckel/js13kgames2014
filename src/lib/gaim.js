module.exports = function(gameWrapper) {
	var entityStore = [],
		componentSetup = {},
		currentId = 1,
		events = {},
		isRunning = false,
		hasGamepad = false,
		keysDown = {};

	// Creates a new entity
	function createEntity(componentsSelector) {
		// Create the entity
		var entity = {
			co : !!componentsSelector ? componentsSelector.split(',') : [],
			id : currentId++,
			on : subscribe,
			t : publish
		};
		entityStore.push(entity);

		// Run component setups
		for(var key in entity.co) {
			var component = entity.co[key];
			if(!!componentSetup[component]) {
				componentSetup[component](entity);
			}
		}

		return entity;
	}

	function createComponent(componentName, setupCallback) {
		// Store the callback for as new entities are created
		componentSetup[componentName] = setupCallback;

		// loop through current entities and setup
		// sh - potential savings
		var entities = find(componentName);
		for(var key in entities) {
			setupCallback(entities[key]);
		}
	}

	// Find by a Component Selector
	function find(selector) {
		if(selector == '*') {
			return entityStore;
		}
		var ret = [];
		for(var e in entityStore) {
			for(var c in entityStore[e].co) {
				if(entityStore[e].co[c] == selector) {
					ret.push(entityStore[e]);
				}
			}
		}
		return ret;
	}

	// Allows subscription to events
	function subscribe(eventName, callback) {
		// Event not yet defined
		if(!events[eventName]) events[eventName] = [];

		events[eventName].push({context: this, callback: callback});
		return this;
	}

	function componentSubscribe(eventName, componentName, callback) {
		// Event not yet defined
		if(!events[eventName]) events[eventName] = [];

		events[eventName].push({component: componentName, callback: callback});
		return this;
	}

	// Allows the publishing of events
	function publish(eventName) {
		if(!events[eventName]) return this;
		var args = Array.prototype.slice.call(arguments, 1);
		for ( var i = 0, l = events[eventName].length; i < l; i++ ) {
            var subscription = events[eventName][i];
            if(subscription.context) {
                subscription.callback.apply(subscription.context, args);
            } else {
                var entities = find(subscription.component);
                for(var j in entities) {
                    subscription.callback.apply(entities[j], args);
                }
            }
        }
        return this;
	}

	// Starts the game with a specific step
	function run(step) {
		step = step || (1000/60); // ~60 fps default
		isRunning = true;
		if(window.Gamepad && window.Gamepad.supported) {
			hasGamepad = true;
			publish('gamepadSupport');
		}
		loop(step);
	}

	function loop(step) {
		if(isRunning) {

			// Handle gamepads
			if(hasGamepad) {
				var gamepadStates = Gamepad.getStates();
				for(var stateIndex in gamepadStates) {
					if(gamepadStates[stateIndex]) {
						publish('gamepad' + stateIndex, gamepadStates[stateIndex], Gamepad.getPreviousState(stateIndex));
					}
				}
			}

			// Create better keydown support for opera
			if(window.opera) {
				for(var key in keysDown) {
					publish('keydown', keysDown[key], key);
				}
			}
			publish('update', step);
			publish('draw');
			publish('postdraw');
			setTimeout(function() {loop(step);}, step);
		}
	}

	function stop() {
		isRunning = false;		
	}

	gameWrapper.onmousedown = function(e) {
		e.isRightClick = e.which ? e.which == 3 : (e.button ? e.button == 2 : false);
		publish('mousedown', e);
	};

	gameWrapper.onmouseup = function(e) {
		publish('mouseup', e);
	};

	gameWrapper.onmousemove = function(e) {
		publish('mousemove', e);
	};

	onkeydown = function(e) {
		keysDown[e.keyCode] = e;
		publish('keydown', e, e.keyCode);
		return false;
	};

	onkeyup = function(e) {
		delete keysDown[e.keyCode];
		publish('keyup', e, e.keyCode);
		return false;
	};

	onresize = function(e) {
		publish('resize');
	};

	return {
		e: createEntity,
		entity: createEntity,
		c: createComponent,
		component: createComponent,
		cs: componentSubscribe,
		subscribe: componentSubscribe,
		f: find,
		find: find,
		r: run,
		run: run,
		s: stop,
		stop: stop,
                KEYS: {
                        LEFT: 37,
                        UP: 38,
                        RIGHT: 39,
                        DOWN: 40
                }

	};
};