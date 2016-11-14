(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var pjson = require('../package.json');

var config = {};

/**
 * Defines the Peak Core Name
 */
config.name = "peak-core";

/**
 * Defines if the debugging mode is turned on
 * @type {Boolean}
 */
config.debug = true;

/**
 * Used as prefix for console outputs.
 * @param {String}
 */
config.consoleTag = config.name + " (" + pjson.version + ")";

/**
 * Method definitions for native methods.
 * @param  {array} An array of method definitions.
 */
config.nativeMethods = require('./required-native-methods');

/**
 * Method definitions for JS methods.
 * @param  {array} An array of method definitions.
 */
config.JSMethods = require('./required-js-methods');

/**
 * Default configuration for modules that do not have an own <<Module>>.config object
 */
config.defaultModuleConfig = {
    skipJSMethodValidationOnInstall : false,
    generateFunctionStubs : false
}


module.exports = config;

},{"../package.json":9,"./required-js-methods":2,"./required-native-methods":3}],2:[function(require,module,exports){
module.exports = {
	'peakCore' : [
		{
			name: 'enableDebug',
			payload: {
				dataType: 'boolean'
			},
			namespace: 'peakCore'
		},
		{
			name: 'setSharedValue',
			payload: {
				dataType: 'object',
				data: {
					key : 'string',
					value : 'string'
				}
			},
			namespace: 'peakCore'
		}
	]
}

},{}],3:[function(require,module,exports){
module.exports = {
   'peakCore' : [
      {
      	name: 'log',
         payload: {
            dataType: 'string'
         },
         namespace: 'peakCore'
      },
      {
      	name: 'logError',
         payload: {
            dataType: 'string'
         },
         namespace: 'peakCore'
      },
      {
      	name: 'onReady',
         namespace: 'peakCore'
      },
      {
         name: 'setSharedValue',
         payload: {
            dataType: 'object',
            data: {
               key: 'string',
               value: 'string'
            }
         },
         namespace: 'peakCore'
      },
      {
         name: 'setSharedPersistentValue',
         payload: {
            dataType: 'object',
            data: {
               key: 'string',
               value: 'string',
               secure: 'boolean'
            }
         },
         namespace: 'peakCore'
      },
      {
         name: 'getSharedStore',
         callback: {
            dataType: 'object',
            data: {}
         },
         namespace: 'peakCore'
      }
   ]
};

},{}],4:[function(require,module,exports){

var helpers = {};

/**
 * Checks wether the current user agent is running Android
 * @return {boolean} True if user agent is android
 */
helpers.isAndroid = function(){
	   if ((typeof navigator == 'undefined')) {
			return false;
		}
		var ua = navigator.userAgent.toLowerCase();
  		return ua.indexOf("android") > -1;
};

/**
 * Checks wether the current user agent is running iOS
 * @return {boolean} True if user agent is iOS
 */
helpers.isiOS = function(){
  	return (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.PeakCore);
};


module.exports = helpers;

},{}],5:[function(require,module,exports){

/**
 * Logger class acts as proxy to deliver console.logs to the native side. (They than show up in the native console instead of just in the JS console)
 * @param  {PeakCore} core An instance of the PeakCore class to handle native communications.
 * @return {Logger}      Logger instance
 */
var logger = function Logger(peak,privateHelpers) {
   if (peak === undefined) {
      console.error("logger.js - No PeakCore instance given!");
   }
   this.peak = peak;
   this.privateHelpers = privateHelpers;
   this.config = peak.config;
   
   this.infoMethodDefinition = this.peak.getNativeMethodDefinition('peakCore', 'log');
   this.errorMethodDefinition = this.peak.getNativeMethodDefinition('peakCore', 'logError');

}

/**
 * Log a debug message to the JS console and via PeakCore to the native console.
 * @param  {string} message The message that should be logged.
 * @param  {string} customTag The log message will include this custom tag if provided.
 */
logger.prototype.info = function(message, customTag) {

   if (customTag === undefined)
      customTag = this.config.consoleTag;
   else
      customTag = this.config.consoleTag + " [" + customTag + "]";

   var logMsg = customTag + ": " + message;
   
   this.privateHelpers.execNativeCall(this.infoMethodDefinition, logMsg);
   console.log(logMsg);
}

/**
 * Log an error message to the JS console and via PeakCore to the native console.
 * @param  {string} message The message that should be logged.
 * @param  {string} customTag The log message will include this custom tag if provided.
 */
logger.prototype.error = function(message, customTag) {

   if (customTag === undefined)
      customTag = this.config.consoleTag;
   else
      customTag = this.config.consoleTag + " [" + customTag + "]";

   var logMsg = customTag + ": " + message;

   this.privateHelpers.execNativeCall(this.errorMethodDefinition, logMsg);
   console.error(logMsg);
}

module.exports = logger;

},{}],6:[function(require,module,exports){
"use strict";

var Config = require('../config/config');
var Helpers = require('./helpers');
var Logger = require('./logger');
var PrivateHelpers = require('./private-helpers');
var Shared = require('./shared');


// private vars
var nativeCallbackFunctions = {};
var privateHelpers;

/**
* The PeakCore class is used to communicate between a JS context and a native iOS or Android app.
* @return {PeakCore}      PeakCore instance
*/
var Core = function PeakCore() {

	// initialize the private helpers
	privateHelpers = new PrivateHelpers(this, {})

	// initialize the property that holds installed peak modules.
	this.modules = {};
	this.modules["peakCore"] = {}

	/**
	* The configuration object
	* @type {object}
	*/
	this.config = Config;

	/**
	* Helpers object
	* @type {object}
	*/
	this.helpers = Helpers;

	/**
	* A Logger instance for logging messages to the native console
	* @type {Logger}
	*/
	this.logger = new Logger(this,privateHelpers);

	/**
	* Convenient method to log an info message.
	* @type {Function}
	*/
	this.info = this.logger.info.bind(this.logger);

	/**
	* Convenient method to log an error message.
	* @type {Function}
	*/
	this.error = this.logger.error.bind(this.logger);


	/**
	* Tell the native side that an arbitriary module is loaded. (Usually used on native side to display the WebView)
	* Must be called explicitly from your Peak App by calling peak.onReady()
	*/
	this.onReady = function() {
		this.callNative('peakCore', 'onReady');
	}

	var that = this;
	// initialize the JavaScript Methods of Peak Core Module
	this.modules["peakCore"].enableDebug = function(state) {
		that.config.debug = state;
	}

}

Core.prototype.initialize = function(initializedCallback) {


	privateHelpers.initializedCallback = initializedCallback;

	/**
	* A Shared datastore.
	* @type {Shared}
	*/
	this.shared = new Shared(this);

	/**
	* Convenient method to set a value into the shared datastore.
	* @type {[type]}
	*/
	this.set = this.shared.set.bind(this.shared);


	/**
	* Convenient method to get a value into the shared datastore.
	* @type {[type]}
	*/
	this.get = this.shared.get.bind(this.shared);


	/**
	* Convenient method to set a value into the shared datastore. This value will be written to the disk.
	* @type {[type]}
	*/
	this.setPersistent = this.shared.setPersistent.bind(this.shared);


	/**
	* Convenient method to set a value into the shared datastore. This value will be written and encrypted to the disk.
	* @type {[type]}
	*/
	this.setPersistentSecure = this.shared.setPersistentSecure.bind(this.shared);

	// Initialize the Shared class
	this.shared.initialize();
}


/**
* Makes this PeakCore instance available in the window.
*/
Core.prototype.makeGlobal = function(varName) {
	if (window)
		window[varName] = this;
}

/**
* Registeres a PeakModule with this PeakCore instance.
* @param  {Object} ModuleClass The module class to be instantiated and registered
* @return {Object}             An instance of the given module.
*/
Core.prototype.useModule = function(ModuleClass, customData) {

	if (ModuleClass === undefined) {
		this.error("Cannot install undefined PeakModule");
		return;
	}

	var module = new ModuleClass(this, customData);


	if (module.packageJSON === undefined) {
		this.error("Module has no packageJSON property defined!");
		return;
	}
	var packageJSON = module.packageJSON;

	if (typeof(module.config) == 'undefined') {
		module.config = this.config.defaultModuleConfig;
	}else{
		for(var key in this.config.defaultModuleConfig){
			if((key in module.config) == false){
				module.config[key] = this.config.defaultModuleConfig[key];
			}
		}
	}

	var packageJSON = module.packageJSON;

	// get the plain module name without "@bitmechanics/".
	var moduleName = packageJSON.name.replace("@bitmechanics/", "");

	//convert came to camelCase.
	var moduleNameCamelCase = privateHelpers.toCamelCase(moduleName);

	// extra var for a more readable code. The module namespace is the camelCase version of the module name.
	var moduleNameSpace = moduleNameCamelCase;

	if (moduleNameCamelCase in this.modules) {
		this.info("Module " + moduleName + " was installed already!");
		return this.modules[moduleNameSpace];
	}

	if (module.nativeMethods === undefined) {
		this.error("Module " + moduleName + " has no nativeMethods property!");
		return;
	}

	if (module.JSMethods === undefined) {
		this.error("Module " + moduleName + " has no JSMethods property!");
		return;
	}

	module._callNative = function(functionName, payload, callback) {
		this.peak.callNative(moduleNameSpace, functionName, payload, callback);
	};

	for (var i = 0; i < module.nativeMethods.length; i++) {
		var definition = module.nativeMethods[i];
		if (typeof(definition.namespace) == 'undefined') {
			definition.namespace = moduleNameSpace;
		}
		//add function stubs to module to ease calling native functions with dot-notation
		if(module.config.generateFunctionStubs == true){
			module[definition.name] = function(funcName){
				return  function(payload, callback){
					module._callNative(funcName,payload,callback);
				};
			}(definition.name);
		}
	}
	var nativeMethodsObj = {};
	nativeMethodsObj[moduleNameSpace] = module.nativeMethods;

	for (var i = 0; i < module.JSMethods.length; i++) {
		var definition = module.JSMethods[i];
		if (typeof(definition.namespace) == 'undefined') {
			definition.namespace = moduleNameSpace;
		}
		if (module.config.skipJSMethodValidationOnInstall == false) {
			if (typeof(module[definition.name]) == 'undefined') {
				this.error(definition.name + " is not implemented in module " + moduleNameSpace);
			}
		}
	}
	var JSMethodsObj = {};
	JSMethodsObj[moduleNameSpace] = module.JSMethods;


	// add the module method definitions to the config object
	this.config.nativeMethods = privateHelpers.mergeObject(this.config.nativeMethods, nativeMethodsObj);
	this.config.JSMethods = privateHelpers.mergeObject(this.config.JSMethods, JSMethodsObj);

	if (this.config.debug) {
		this.info("nativeMethods: " + JSON.stringify(this.config.nativeMethods, null, 4));
		this.info("JSMethods: " + JSON.stringify(this.config.JSMethods, null, 4));

		var infoMsg = "Module " + moduleName + " with version " + packageJSON.version + " was installed\n"
		+ 'with configuration: ' + JSON.stringify(module.config,null,4);

		this.info(infoMsg);
	}


	module._info = function(msg) {
		this.peak.info(msg,moduleName + "(" + packageJSON.version + ")");
	};

	module._error = function(msg) {
		this.peak.error(msg,moduleName + "(" + packageJSON.version + ")");
	};

	module.name = moduleName;
	module.namespace = moduleNameSpace;

	this.modules[moduleNameSpace] = module
	return module;
}

/**
* callJS is used by the native side to call a method in JS.
* @param  {string} namespace 	  The namespace of the JS function to call.
* @param  {string} functionName   Name of the JS function.
* @param  {any} payload           Payload to deliver to the function.
* @param  {string} nativeCallback Function name of the native callback. (Only required on Android)
*/
Core.prototype.callJS = function(namespace, functionName, payload, nativeCallback) {

	if (this.config.debug) {
		this.info("JS function " + namespace + "/" + functionName + " called.");
	}

	if (privateHelpers.isModuleInstalled(namespace) == false) {
		this.error("Module " + namespace + " is not installed.")
		return;
	}

	//Get JS method definition
	var JSMethodDefinition = this.getJSMethodDefinition(namespace, functionName);

	// is method defined in config?
	if (JSMethodDefinition === undefined) {
		this.error(namespace + "/" + functionName + "() is not implemented in JavaScript Code!");
		return;
	}

	// is payload type correct? (payload types for functions are defined in the config object)
	if (privateHelpers.isNativeMethodPayloadValid(JSMethodDefinition, payload) == false) {
		this.error(namespace + "/" + functionName + "() payload not valid!");
		return;
	}

	var module = this.modules[namespace];

	var callbackData = module[functionName](payload);

	// skip the rest if we dont need a callback
	if (typeof(JSMethodDefinition.callback) == 'undefined') {
		return;
	}

	if (privateHelpers.isCallbackDataValidForMethodDefinition(JSMethodDefinition, callbackData) == false) {
		return;
	}

	if(callbackData !== undefined){
		if (this.helpers.isiOS()) {
			return callbackData;
		} else {
			if(this.config.debug){
				this.info("Android Native Callback " + nativeCallback +"() called. With data: " + JSON.stringify(callbackData,null,4));
			}

			// execute the native call
			//Set universal callback name in Android
			JSMethodDefinition.callback.name = "invokeNativeCallback";
			privateHelpers.execNativeCall(JSMethodDefinition, callbackData, callbackKey);
		}

	}

}

/**
* This function is used by the native side to invoce a callback function.
* @param  {string} callbackFunctionName The function name of the callback
* @param  {any} jsonData     Payload of the callback.
*/
Core.prototype.callCallback = function(callbackFunctionName, jsonData) {

	if (this.config.debug) {
		if(typeof(jsonData) == 'object'){
			this.info("JS callback '" + callbackFunctionName + "'' called. With data: " + JSON.stringify(jsonData,null,4));
		}else{
			this.info("JS callback '" + callbackFunctionName + "' called. With data: " + jsonData);
		}
	}

	if (callbackFunctionName in nativeCallbackFunctions) {

		var callbackFunction = nativeCallbackFunctions[callbackFunctionName].callbackFunction;
		var callerFunctionName = nativeCallbackFunctions[callbackFunctionName].callerFunctionName;
		var callerNamespace = nativeCallbackFunctions[callbackFunctionName].callerNamespace;

		var method = this.getNativeMethodDefinition(callerNamespace, callerFunctionName);

		if (privateHelpers.isCallbackDataValidForMethodDefinition(method, jsonData) == false) {
			this.error(callerFunctionName + "() callback data does not match definition!");
			return;
		}

		callbackFunction(jsonData);

		//Free memory
		delete nativeCallbackFunctions[callbackFunctionName];

	} else {
		this.error(callbackFunctionName + "() callback not defined!");
	}
};


/**
* callNative is used to call a native function from JS.
* @param  {string}   namespace or module name of the handling module
* @param  {string}   functionName Name of the native function.
* @param  {any}   payload      Payload to deliver to the native function
* @param  {Function} callback     JS callback function to receive return values from native.
*/
Core.prototype.callNative = function(namespace, functionName, payload, callback) {

	if (this.config.debug) {
		this.info("Native function " + namespace + "/" + functionName + "() called.");
	}

	//Get native method definition
	var nativeMethodDefinition = this.getNativeMethodDefinition(namespace, functionName);

	// is method defined?
	if (nativeMethodDefinition === undefined) {
		this.error(namespace + "/" + functionName + "() is not a defined method.");
		return;
	}


	if (typeof payload === 'function') {
		callback = payload;
		payload = null;
	}

	// is payload type correct?
	if (privateHelpers.isNativeMethodPayloadValid(nativeMethodDefinition, payload) == false) {
		return;
	}


	if (callback !== undefined) {
		//Generate temporary key for callback function
		var callbackKey = privateHelpers.generateId();
		nativeCallbackFunctions[callbackKey] = {
			callerNamespace: namespace,
			callerFunctionName: functionName,
			callbackFunction: callback
		};
	}

	privateHelpers.execNativeCall(nativeMethodDefinition, payload, callbackKey);
};

/**
* Gets the native method definition for a given function name. (Method definitions are defined in the config object)
* @param  {string} functionName The name of the function whos definition has to be returned.
* @return {object}              Function definition or undefined if function not found.
*/
Core.prototype.getNativeMethodDefinition = function(namespace, functionName) {
	for (var i = 0; i < this.config.nativeMethods[namespace].length; i++) {
		var method = this.config.nativeMethods[namespace][i];
		if (method.name == functionName) {
			return method;
		}
	}
	return undefined;
};


/**
* Gets the JS method definition for a given function name. (Method definitions are defined in the config object)
* @param  {string} functionName The name of the function whos definition has to be returned.
* @return {object}              Function definition or undefined if function not found.
*/
Core.prototype.getJSMethodDefinition = function(namespace, functionName) {
	for (var i = 0; i < this.config.JSMethods[namespace].length; i++) {
		var method = this.config.JSMethods[namespace][i];
		if (method.name == functionName) {
			return method;
		}
	}
	return undefined;
};

Core.prototype.addSubcomponentToInitialize = function() {
	privateHelpers.addSubcomponentToInitialize();
}

Core.prototype.subcomponentDidInitialize = function() {
	privateHelpers.subcomponentDidInitialize();
}


//
// Export the PeakCore class
module.exports = Core;

},{"../config/config":1,"./helpers":4,"./logger":5,"./private-helpers":7,"./shared":8}],7:[function(require,module,exports){

/**
 * A collection of private helpers to operate PeakCore.
 * @param {PeakCore} core        A PeakCore instance
 */
var PrivateHelpers = function(peak, privateData) {
   this.core = peak;

   // This is a temporary fix. After x times the subcomponentDidInitialize() method is called we assume Peak has loaded
   this.numOfComponentsToInitialize = 0
   this.subcomponentsDidInitialize = 0
}

/**
 * Checks if a certain module was installed already
 * @param  {string}  namespace The namespace of the module
 * @return {Boolean}           True of False if modules was installed
 */
PrivateHelpers.prototype.isModuleInstalled = function (namespace) {
   return !(typeof(this.core.modules[namespace]) == 'undefined')
};



/**
 * Checks wether a given payload type matches the definition in the config object for that method.
 * @param  {object} nativeMethodDefinition Method definition of the method which payload has to be checked.
 * @param  {any} payload                The payload given.
 * @return {boolean}                        true or false wether the definition matches the payload or not.
 */
PrivateHelpers.prototype.isNativeMethodPayloadValid = function(nativeMethodDefinition, payload) {

	//Do not check in production mode
	if(!this.core.config.debug){
		return true;
	}

   // if we don't specify a payloadType in the method definition, we set it to none manually
   if (typeof(nativeMethodDefinition.payload) == 'undefined') {
      nativeMethodDefinition.payload = {
         dataType: 'none'
      }
   }

	if (payload == null) {
		if  (nativeMethodDefinition.payload.dataType != 'none') {
			this.core.logger.error(nativeMethodDefinition.name + '(<'+ type +'>) Type mismatch. Expected <'+ nativeMethodDefinition.payload.dataType +'>');
			return false;
		}
		return true;
	}


	var type = typeof(payload);

	if (type == 'object' && payload.length !== undefined) { // if array
		type = 'array';
	}

   if (type == 'number' && nativeMethodDefinition.payload.dataType == 'boolean') {
      return true
   }

	if (type != nativeMethodDefinition.payload.dataType) {
		this.core.logger.error(nativeMethodDefinition.name + '(<'+ type +'>) Type mismatch. Expected <'+ nativeMethodDefinition.payload.dataType +'>');
		return false;
	}

	//Check payloadData for objects
	if (type == 'object'){
		if (nativeMethodDefinition.payload.data === undefined){
			this.core.logger.error(nativeMethodDefinition.name + "PayloadData not declared!");
			return false;
		}
		for (var key in nativeMethodDefinition.payload.data) {
			if ((key in payload) == false) {
				this.core.logger.error(nativeMethodDefinition.name + "PayloadData mismatch! Expected <'" + key + "'>");
				return false;
			}
	}

	}

	return true;

};

/**
 * Checks wether the given data from a callback matches the method definition.
 * @param  {object} JSMethodDefinition Method definition for the called js function.
 * @param  {[type]} jsonData         Callback payload
 * @return {boolean}                  true or false
 */
PrivateHelpers.prototype.isCallbackDataValidForMethodDefinition = function(JSMethodDefinition, jsonData) {

	//Do not check in production mode
	if(!this.core.config.debug){
		return true;
	}

	//Used for VUE/JS Functions without a callback
	if(JSMethodDefinition === undefined && jsonData === undefined){
		return true;
	}

   var callbackDefinition = JSMethodDefinition.callback;

   if (typeof(callbackDefinition) == 'undefined' && jsonData) {
      this.core.logger.error(JSMethodDefinition.namespace + "/" + JSMethodDefinition.name + ' has no defined callback in it\'s method definition.');
      return false;
   }

	if (typeof(callbackDefinition) == 'undefined' && typeof(jsonData) == 'undefined') {
		return true;
	}

	var type = typeof(jsonData);
	if (type == 'object' && jsonData.length !== undefined) { // if array
		type = 'array';
	}

	if (type != callbackDefinition.dataType) {
		this.core.logger.error(JSMethodDefinition.namespace + "/" + JSMethodDefinition.name + '(<'+ type +'>) callback data type mismatch. Expected <'+ callbackDefinition.dataType +'>');
		return false;
	}

	if(type == 'object'){
		for (var key in callbackDefinition.data) {
			if ((key in jsonData) == false) {
				this.core.logger.error(JSMethodDefinition.namespace + "/" + JSMethodDefinition.name + "CallbackData mismatch! Expected <'" + key + "'>");
				return false;
			}
		}
	}

	return true;
};

/**
 * Invokes a native method.
 * @param  {string} namespace              The namespace of the native method to call.
 * @param  {object} nativeMethodDefinition Method definition for native function
 * @param  {any} payload                   Native method payload
 * @param  {string} callbackKey            JS Callback function name.
 */
PrivateHelpers.prototype.execNativeCall = function(nativeMethodDefinition, payload, callbackKey) {


	if (this.core.helpers.isiOS()) {

      if (typeof(window) == 'undefined' || typeof(window.webkit) == 'undefined' || typeof(window.webkit.messageHandlers) == 'undefined') {
         console.error(this.core.config.name + "-ios does not exist!");
         return;
		}

      if(payload === null || payload === undefined) {
         payload = "";
      }

		window.webkit.messageHandlers.PeakCore.postMessage({
         methodDefinition: nativeMethodDefinition,
			payload: payload,
			callbackKey: callbackKey
		});

	} else if (this.core.helpers.isAndroid()) {

		if (typeof(PeakCore) == 'undefined') {
         	console.error(this.core.config.name + "-android does not exist!");
			return;
		}
		try{
         if(payload === null || payload === undefined) {
            payload = "null";
         }
         if(callbackKey === null || callbackKey === undefined){
            callbackKey = "null"
         }
			//Invoke native function name
         //Convert Objects to String
			if(typeof(payload) == 'object'){
				payload = JSON.stringify(payload);
			}
			PeakCore['invokeNativeMethod'](JSON.stringify(nativeMethodDefinition), payload, callbackKey);
		}catch(e){
			console.error(nativeMethodDefinition.namespace + "/" + nativeMethodDefinition.name + "(). Android Interface method not defined.")
		}
	}
};

/**
 * Generates a random function name
 * @return {string} Random function name
 */
PrivateHelpers.prototype.generateId = function() {
   var cid = "__peakCallback";
   var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
   for( var i=0; i < 8; i++ ) {
      cid += chars.charAt(Math.floor(Math.random() * chars.length));
   }
   return cid;
};


/**
 * Converts any string into camelCase.
 * @param {string} str String to convert to camelCase.
 * @return {string} Converted String
 */
PrivateHelpers.prototype.toCamelCase = function(str) {
    return str.replace(/^([A-Z])|[\s-_](\w)/g, function(match, p1, p2, offset) {
        if (p2) return p2.toUpperCase();
        return p1.toLowerCase();
    });
};


/**
 * Merges two JS objects.
 * @param  {Object} obj1 First object
 * @param  {Object} obj2 Second object
 * @return {Object}      Result object
 */
PrivateHelpers.prototype.mergeObject = function (obj1, obj2) {
  for (var p in obj2) {
    try {
      // Property in destination object set; update its value.
      if ( obj2[p].constructor==Object ) {
        obj1[p] = MergeRecursive(obj1[p], obj2[p]);
      } else {
        obj1[p] = obj2[p];

      }
    } catch(e) {
      // Property in destination object not set; create it and set its value.
      obj1[p] = obj2[p];

    }
  }
  return obj1;
}

PrivateHelpers.prototype.addSubcomponentToInitialize = function() {
   this.numOfComponentsToInitialize += 1;
}

PrivateHelpers.prototype.subcomponentDidInitialize = function() {
   this.core.info("Subcomponent did initialize!")
   this.subcomponentsDidInitialize += 1;
   if (this.subcomponentsDidInitialize == this.numOfComponentsToInitialize) {
      if (this.initializedCallback)
         this.initializedCallback(this.core);
   }
}


module.exports = PrivateHelpers;

},{}],8:[function(require,module,exports){


var Shared = function Shared(peak) {

   if (peak === undefined) {
      console.error("shared.js - No PeakCore instance given!");
   }

   this.peak = peak;
   this.data = {};


}

Shared.prototype.initialize = function() {
   // Tell peak that it has to wait until shared has loaded completely.
   this.peak.addSubcomponentToInitialize()

   let that = this;
   this.peak.modules['peakCore'].setSharedValue = function(payload) {
      that.data[payload.key] = payload.value
   }

   if (this.peak.helpers.isiOS() || this.peak.helpers.isAndroid()) {
      this.peak.callNative('peakCore', 'getSharedStore', function(store) {
         that.data = store
         that.peak.subcomponentDidInitialize()
      })
   } else {
      this.peak.info("Store not available since we are not on iOS or Android.")
      that.peak.subcomponentDidInitialize()
   }


   this.peak.modules['peakCore'].setSharedValue = function(payload) {
      that.data[payload.key] = payload.value
   }

}

Shared.prototype.get = function(key) {
   let test = this.data[key];
   return test;
}

Shared.prototype.set = function(key, value) {
   this.data[key] = value;
   this.peak.callNative('peakCore', 'setSharedValue', {
       'key': key,
       'value' : value
    });
}

Shared.prototype.setPersistent = function(key, value) {
   this.data[key] = value;
   this.peak.callNative('peakCore', 'setSharedPersistentValue', {
       'key': key,
       'value' : value,
       'secure' : false
    });
}

Shared.prototype.setPersistentSecure = function(key, value) {
   this.data[key] = value;
   this.peak.callNative('peakCore', 'setSharedPersistentValue', {
       'key': key,
       'value' : value,
       'secure' : true
    });
}
module.exports = Shared

},{}],9:[function(require,module,exports){
module.exports={
  "name": "@bitmechanics/peak-core",
  "version": "1.0.15",
  "description": "PEAK Core is the core module that handles native <> js communications and a logging proxy.",
  "main": "index.js",
  "repository": {
    "type": "git",
    "url": "git+https://robin-bitmechanics@bitbucket.org/bitmechanicsgmbh/peak-core.git"
  },
  "author": "Robin Reiter & Matthias Hermann",
  "devDependencies": {
    "json-loader": "^0.5.4"
  }
}

},{}],10:[function(require,module,exports){
module.exports = {
  niceFunction: function () {
    console.log("I am a nice function!")
  }
};

},{}],11:[function(require,module,exports){

const MyLibrary = require('../_shared_modules/my-library');


// initialize peak
// const PeakCore = require('@bitmechanics/peak-core');
const PeakCore = require('../../../peak-core/lib/peak-core');
const peak = new PeakCore();
peak.makeGlobal('peak');

// Load the userland module and the methods that you need for this component.
const methodDefinitions = require('./method-definitions');
peak.useModule(require('@bitmechanics/peak-userland'), methodDefinitions);


peak.initialize((peakInstance) => {
   console.log("Peak Initialized!!!!")
   let peak = peakInstance;
   let userland = peak.modules.peakUserland;

   let that = peak;

   // Bind a JS method so the native side can call it
   userland.bind('sort', function(arrayIfNumbers) {
      return _.sortBy(arrayIfNumbers, function(num)
      {
         return Math.sin(num)
      });
   });

   userland.bind('debugModeTest', function() {
      if (peak.config.debug) {
         peak.info("Debug mode is enabled")
      } else {
         peak.info("Debug mode is disabled")
      }
   })


   // Load JS code from _shared_modules
   MyLibrary.niceFunction();

   // peak.set('key', 'value')
   // peak.get('key', (value) => {
   //    peak.info("IYF " + value)
   // })
   //

   // peak.info("Top Secret " + peak.get('secure-token'))
   // peak.setPersistent('some-persistent-value', 'Hi!')
   // peak.setPersistentSecure('secure-token', 'I am very secure!')

   // Always trigger onReady() once your code is ready.
   //This tells the peak ecosystem (especially the peak native side) that you are ready!


   // setTimeout(() => {
   //    console.log("Get MyKey " + peak.get("MyKey"))
   //    peak.info(peak.get("MyKey"))
   // }, 2000)

   // Execute a native method
   // peakUserland.displayTime(Date.now())

   // Tell peak-core-native that our userland side is are ready!
   peak.onReady();

})

},{"../../../peak-core/lib/peak-core":6,"../_shared_modules/my-library":10,"./method-definitions":12,"@bitmechanics/peak-userland":15}],12:[function(require,module,exports){
module.exports = {
   native: [

   ],
   js: [
      {
         name: 'sort',
         payload: {
            dataType: 'array'
         },
         callback: {
            dataType: 'array'
         }
      },
      {
         name: 'displayTime',
         payload: {
            dataType: 'string'
         }
      },
      {
         name: 'debugModeTest'
      }
   ]
}

},{}],13:[function(require,module,exports){
var config = {
    "skipJSMethodValidationOnInstall" : true,
    "generateFunctionStubs": true,
}

module.exports = config;
},{}],14:[function(require,module,exports){
module.exports={
  "_args": [
    [
      "@bitmechanics/peak-userland@^1.0.1",
      "/Users/robin/Documents/Firma/Laufende Projekte/falkemedia GmbH/HomeConnect/JSPort/fm-simplyyummy-peak"
    ]
  ],
  "_from": "@bitmechanics/peak-userland@>=1.0.1 <2.0.0",
  "_id": "@bitmechanics/peak-userland@1.0.1",
  "_inCache": true,
  "_installable": true,
  "_location": "/@bitmechanics/peak-userland",
  "_nodeVersion": "6.2.0",
  "_npmOperationalInternal": {
    "host": "packages-16-east.internal.npmjs.com",
    "tmp": "tmp/peak-userland-1.0.1.tgz_1465927778796_0.41101393452845514"
  },
  "_npmUser": {
    "email": "robin@bitmechanics.de",
    "name": "robin7331"
  },
  "_npmVersion": "3.7.5",
  "_phantomChildren": {},
  "_requested": {
    "name": "@bitmechanics/peak-userland",
    "raw": "@bitmechanics/peak-userland@^1.0.1",
    "rawSpec": "^1.0.1",
    "scope": "@bitmechanics",
    "spec": ">=1.0.1 <2.0.0",
    "type": "range"
  },
  "_requiredBy": [
    "/"
  ],
  "_shasum": "5b08a46dd80c81bf06618ceda74b157b508e0590",
  "_shrinkwrap": null,
  "_spec": "@bitmechanics/peak-userland@^1.0.1",
  "_where": "/Users/robin/Documents/Firma/Laufende Projekte/falkemedia GmbH/HomeConnect/JSPort/fm-simplyyummy-peak",
  "author": {
    "name": "Robin Reiter & Matthias Hermann"
  },
  "dependencies": {},
  "description": "## Installation ##",
  "devDependencies": {},
  "directories": {},
  "dist": {
    "shasum": "5b08a46dd80c81bf06618ceda74b157b508e0590",
    "tarball": "https://registry.npmjs.org/@bitmechanics/peak-userland/-/peak-userland-1.0.1.tgz"
  },
  "main": "peak-userland.js",
  "maintainers": [
    {
      "email": "robin@bitmechanics.de",
      "name": "robin7331"
    },
    {
      "email": "ubootfenster@googlemail.com",
      "name": "twittadrock"
    }
  ],
  "name": "@bitmechanics/peak-userland",
  "optionalDependencies": {},
  "readme": "ERROR: No README data found!",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "version": "1.0.1"
}

},{}],15:[function(require,module,exports){
var PeakModule = function (peak, customData) {
   this.packageJSON = require('./package.json');
   this.config = require('./config');
   this.peak = peak;
   this.nativeMethods = customData.native;
   this.JSMethods = customData.js;
}


/**
 * Binds a custom JS function to the PeakCore system.
 * @param  {string} functionName The name of the function.
 * @param  {object} func         The function itself.
 */
PeakModule.prototype.bind = function(functionName, func){

	var JSMethodDefinition = this.peak.getJSMethodDefinition("peakUserland",functionName);

	if(JSMethodDefinition === undefined){
		this._error(functionName +"() is not declared in method definitions!")
		return;
	}

	//Register a callable JS Function that simply broadcasts an event that has the same name as the function
	this[functionName] = func;
	if(this.peak.config.debug){
		this._info(functionName + "() has been binded to " + this.name);
	}
};

module.exports = PeakModule;

},{"./config":13,"./package.json":14}]},{},[11])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9wZWFrLWNvcmUvY29uZmlnL2NvbmZpZy5qcyIsIi4uL3BlYWstY29yZS9jb25maWcvcmVxdWlyZWQtanMtbWV0aG9kcy5qcyIsIi4uL3BlYWstY29yZS9jb25maWcvcmVxdWlyZWQtbmF0aXZlLW1ldGhvZHMuanMiLCIuLi9wZWFrLWNvcmUvbGliL2hlbHBlcnMuanMiLCIuLi9wZWFrLWNvcmUvbGliL2xvZ2dlci5qcyIsIi4uL3BlYWstY29yZS9saWIvcGVhay1jb3JlLmpzIiwiLi4vcGVhay1jb3JlL2xpYi9wcml2YXRlLWhlbHBlcnMuanMiLCIuLi9wZWFrLWNvcmUvbGliL3NoYXJlZC5qcyIsIi4uL3BlYWstY29yZS9wYWNrYWdlLmpzb24iLCJjbGllbnRfc3JjL19zaGFyZWRfbW9kdWxlcy9teS1saWJyYXJ5LmpzIiwiY2xpZW50X3NyYy9sb2dpY19zYW1wbGUtbG9naWMtbW9kdWxlL2FwcC5qcyIsImNsaWVudF9zcmMvbG9naWNfc2FtcGxlLWxvZ2ljLW1vZHVsZS9tZXRob2QtZGVmaW5pdGlvbnMuanMiLCJub2RlX21vZHVsZXMvQGJpdG1lY2hhbmljcy9wZWFrLXVzZXJsYW5kL2NvbmZpZy5qcyIsIm5vZGVfbW9kdWxlcy9AYml0bWVjaGFuaWNzL3BlYWstdXNlcmxhbmQvcGFja2FnZS5qc29uIiwibm9kZV9tb2R1bGVzL0BiaXRtZWNoYW5pY3MvcGVhay11c2VybGFuZC9wZWFrLXVzZXJsYW5kLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4YkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBwanNvbiA9IHJlcXVpcmUoJy4uL3BhY2thZ2UuanNvbicpO1xuXG52YXIgY29uZmlnID0ge307XG5cbi8qKlxuICogRGVmaW5lcyB0aGUgUGVhayBDb3JlIE5hbWVcbiAqL1xuY29uZmlnLm5hbWUgPSBcInBlYWstY29yZVwiO1xuXG4vKipcbiAqIERlZmluZXMgaWYgdGhlIGRlYnVnZ2luZyBtb2RlIGlzIHR1cm5lZCBvblxuICogQHR5cGUge0Jvb2xlYW59XG4gKi9cbmNvbmZpZy5kZWJ1ZyA9IHRydWU7XG5cbi8qKlxuICogVXNlZCBhcyBwcmVmaXggZm9yIGNvbnNvbGUgb3V0cHV0cy5cbiAqIEBwYXJhbSB7U3RyaW5nfVxuICovXG5jb25maWcuY29uc29sZVRhZyA9IGNvbmZpZy5uYW1lICsgXCIgKFwiICsgcGpzb24udmVyc2lvbiArIFwiKVwiO1xuXG4vKipcbiAqIE1ldGhvZCBkZWZpbml0aW9ucyBmb3IgbmF0aXZlIG1ldGhvZHMuXG4gKiBAcGFyYW0gIHthcnJheX0gQW4gYXJyYXkgb2YgbWV0aG9kIGRlZmluaXRpb25zLlxuICovXG5jb25maWcubmF0aXZlTWV0aG9kcyA9IHJlcXVpcmUoJy4vcmVxdWlyZWQtbmF0aXZlLW1ldGhvZHMnKTtcblxuLyoqXG4gKiBNZXRob2QgZGVmaW5pdGlvbnMgZm9yIEpTIG1ldGhvZHMuXG4gKiBAcGFyYW0gIHthcnJheX0gQW4gYXJyYXkgb2YgbWV0aG9kIGRlZmluaXRpb25zLlxuICovXG5jb25maWcuSlNNZXRob2RzID0gcmVxdWlyZSgnLi9yZXF1aXJlZC1qcy1tZXRob2RzJyk7XG5cbi8qKlxuICogRGVmYXVsdCBjb25maWd1cmF0aW9uIGZvciBtb2R1bGVzIHRoYXQgZG8gbm90IGhhdmUgYW4gb3duIDw8TW9kdWxlPj4uY29uZmlnIG9iamVjdFxuICovXG5jb25maWcuZGVmYXVsdE1vZHVsZUNvbmZpZyA9IHtcbiAgICBza2lwSlNNZXRob2RWYWxpZGF0aW9uT25JbnN0YWxsIDogZmFsc2UsXG4gICAgZ2VuZXJhdGVGdW5jdGlvblN0dWJzIDogZmFsc2Vcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbmZpZztcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHQncGVha0NvcmUnIDogW1xuXHRcdHtcblx0XHRcdG5hbWU6ICdlbmFibGVEZWJ1ZycsXG5cdFx0XHRwYXlsb2FkOiB7XG5cdFx0XHRcdGRhdGFUeXBlOiAnYm9vbGVhbidcblx0XHRcdH0sXG5cdFx0XHRuYW1lc3BhY2U6ICdwZWFrQ29yZSdcblx0XHR9LFxuXHRcdHtcblx0XHRcdG5hbWU6ICdzZXRTaGFyZWRWYWx1ZScsXG5cdFx0XHRwYXlsb2FkOiB7XG5cdFx0XHRcdGRhdGFUeXBlOiAnb2JqZWN0Jyxcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGtleSA6ICdzdHJpbmcnLFxuXHRcdFx0XHRcdHZhbHVlIDogJ3N0cmluZydcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdG5hbWVzcGFjZTogJ3BlYWtDb3JlJ1xuXHRcdH1cblx0XVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAncGVha0NvcmUnIDogW1xuICAgICAge1xuICAgICAgXHRuYW1lOiAnbG9nJyxcbiAgICAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgICAgIGRhdGFUeXBlOiAnc3RyaW5nJ1xuICAgICAgICAgfSxcbiAgICAgICAgIG5hbWVzcGFjZTogJ3BlYWtDb3JlJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgIFx0bmFtZTogJ2xvZ0Vycm9yJyxcbiAgICAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgICAgIGRhdGFUeXBlOiAnc3RyaW5nJ1xuICAgICAgICAgfSxcbiAgICAgICAgIG5hbWVzcGFjZTogJ3BlYWtDb3JlJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgIFx0bmFtZTogJ29uUmVhZHknLFxuICAgICAgICAgbmFtZXNwYWNlOiAncGVha0NvcmUnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICAgbmFtZTogJ3NldFNoYXJlZFZhbHVlJyxcbiAgICAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgICAgIGRhdGFUeXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgIGtleTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICB2YWx1ZTogJ3N0cmluZydcbiAgICAgICAgICAgIH1cbiAgICAgICAgIH0sXG4gICAgICAgICBuYW1lc3BhY2U6ICdwZWFrQ29yZSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgICBuYW1lOiAnc2V0U2hhcmVkUGVyc2lzdGVudFZhbHVlJyxcbiAgICAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgICAgIGRhdGFUeXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgIGtleTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICB2YWx1ZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICBzZWN1cmU6ICdib29sZWFuJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgfSxcbiAgICAgICAgIG5hbWVzcGFjZTogJ3BlYWtDb3JlJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgIG5hbWU6ICdnZXRTaGFyZWRTdG9yZScsXG4gICAgICAgICBjYWxsYmFjazoge1xuICAgICAgICAgICAgZGF0YVR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgZGF0YToge31cbiAgICAgICAgIH0sXG4gICAgICAgICBuYW1lc3BhY2U6ICdwZWFrQ29yZSdcbiAgICAgIH1cbiAgIF1cbn07XG4iLCJcbnZhciBoZWxwZXJzID0ge307XG5cbi8qKlxuICogQ2hlY2tzIHdldGhlciB0aGUgY3VycmVudCB1c2VyIGFnZW50IGlzIHJ1bm5pbmcgQW5kcm9pZFxuICogQHJldHVybiB7Ym9vbGVhbn0gVHJ1ZSBpZiB1c2VyIGFnZW50IGlzIGFuZHJvaWRcbiAqL1xuaGVscGVycy5pc0FuZHJvaWQgPSBmdW5jdGlvbigpe1xuXHQgICBpZiAoKHR5cGVvZiBuYXZpZ2F0b3IgPT0gJ3VuZGVmaW5lZCcpKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHZhciB1YSA9IG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKTtcbiAgXHRcdHJldHVybiB1YS5pbmRleE9mKFwiYW5kcm9pZFwiKSA+IC0xO1xufTtcblxuLyoqXG4gKiBDaGVja3Mgd2V0aGVyIHRoZSBjdXJyZW50IHVzZXIgYWdlbnQgaXMgcnVubmluZyBpT1NcbiAqIEByZXR1cm4ge2Jvb2xlYW59IFRydWUgaWYgdXNlciBhZ2VudCBpcyBpT1NcbiAqL1xuaGVscGVycy5pc2lPUyA9IGZ1bmN0aW9uKCl7XG4gIFx0cmV0dXJuICh3aW5kb3cud2Via2l0ICYmIHdpbmRvdy53ZWJraXQubWVzc2FnZUhhbmRsZXJzICYmIHdpbmRvdy53ZWJraXQubWVzc2FnZUhhbmRsZXJzLlBlYWtDb3JlKTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBoZWxwZXJzO1xuIiwiXG4vKipcbiAqIExvZ2dlciBjbGFzcyBhY3RzIGFzIHByb3h5IHRvIGRlbGl2ZXIgY29uc29sZS5sb2dzIHRvIHRoZSBuYXRpdmUgc2lkZS4gKFRoZXkgdGhhbiBzaG93IHVwIGluIHRoZSBuYXRpdmUgY29uc29sZSBpbnN0ZWFkIG9mIGp1c3QgaW4gdGhlIEpTIGNvbnNvbGUpXG4gKiBAcGFyYW0gIHtQZWFrQ29yZX0gY29yZSBBbiBpbnN0YW5jZSBvZiB0aGUgUGVha0NvcmUgY2xhc3MgdG8gaGFuZGxlIG5hdGl2ZSBjb21tdW5pY2F0aW9ucy5cbiAqIEByZXR1cm4ge0xvZ2dlcn0gICAgICBMb2dnZXIgaW5zdGFuY2VcbiAqL1xudmFyIGxvZ2dlciA9IGZ1bmN0aW9uIExvZ2dlcihwZWFrLHByaXZhdGVIZWxwZXJzKSB7XG4gICBpZiAocGVhayA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFwibG9nZ2VyLmpzIC0gTm8gUGVha0NvcmUgaW5zdGFuY2UgZ2l2ZW4hXCIpO1xuICAgfVxuICAgdGhpcy5wZWFrID0gcGVhaztcbiAgIHRoaXMucHJpdmF0ZUhlbHBlcnMgPSBwcml2YXRlSGVscGVycztcbiAgIHRoaXMuY29uZmlnID0gcGVhay5jb25maWc7XG4gICBcbiAgIHRoaXMuaW5mb01ldGhvZERlZmluaXRpb24gPSB0aGlzLnBlYWsuZ2V0TmF0aXZlTWV0aG9kRGVmaW5pdGlvbigncGVha0NvcmUnLCAnbG9nJyk7XG4gICB0aGlzLmVycm9yTWV0aG9kRGVmaW5pdGlvbiA9IHRoaXMucGVhay5nZXROYXRpdmVNZXRob2REZWZpbml0aW9uKCdwZWFrQ29yZScsICdsb2dFcnJvcicpO1xuXG59XG5cbi8qKlxuICogTG9nIGEgZGVidWcgbWVzc2FnZSB0byB0aGUgSlMgY29uc29sZSBhbmQgdmlhIFBlYWtDb3JlIHRvIHRoZSBuYXRpdmUgY29uc29sZS5cbiAqIEBwYXJhbSAge3N0cmluZ30gbWVzc2FnZSBUaGUgbWVzc2FnZSB0aGF0IHNob3VsZCBiZSBsb2dnZWQuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGN1c3RvbVRhZyBUaGUgbG9nIG1lc3NhZ2Ugd2lsbCBpbmNsdWRlIHRoaXMgY3VzdG9tIHRhZyBpZiBwcm92aWRlZC5cbiAqL1xubG9nZ2VyLnByb3RvdHlwZS5pbmZvID0gZnVuY3Rpb24obWVzc2FnZSwgY3VzdG9tVGFnKSB7XG5cbiAgIGlmIChjdXN0b21UYWcgPT09IHVuZGVmaW5lZClcbiAgICAgIGN1c3RvbVRhZyA9IHRoaXMuY29uZmlnLmNvbnNvbGVUYWc7XG4gICBlbHNlXG4gICAgICBjdXN0b21UYWcgPSB0aGlzLmNvbmZpZy5jb25zb2xlVGFnICsgXCIgW1wiICsgY3VzdG9tVGFnICsgXCJdXCI7XG5cbiAgIHZhciBsb2dNc2cgPSBjdXN0b21UYWcgKyBcIjogXCIgKyBtZXNzYWdlO1xuICAgXG4gICB0aGlzLnByaXZhdGVIZWxwZXJzLmV4ZWNOYXRpdmVDYWxsKHRoaXMuaW5mb01ldGhvZERlZmluaXRpb24sIGxvZ01zZyk7XG4gICBjb25zb2xlLmxvZyhsb2dNc2cpO1xufVxuXG4vKipcbiAqIExvZyBhbiBlcnJvciBtZXNzYWdlIHRvIHRoZSBKUyBjb25zb2xlIGFuZCB2aWEgUGVha0NvcmUgdG8gdGhlIG5hdGl2ZSBjb25zb2xlLlxuICogQHBhcmFtICB7c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRoYXQgc2hvdWxkIGJlIGxvZ2dlZC5cbiAqIEBwYXJhbSAge3N0cmluZ30gY3VzdG9tVGFnIFRoZSBsb2cgbWVzc2FnZSB3aWxsIGluY2x1ZGUgdGhpcyBjdXN0b20gdGFnIGlmIHByb3ZpZGVkLlxuICovXG5sb2dnZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24obWVzc2FnZSwgY3VzdG9tVGFnKSB7XG5cbiAgIGlmIChjdXN0b21UYWcgPT09IHVuZGVmaW5lZClcbiAgICAgIGN1c3RvbVRhZyA9IHRoaXMuY29uZmlnLmNvbnNvbGVUYWc7XG4gICBlbHNlXG4gICAgICBjdXN0b21UYWcgPSB0aGlzLmNvbmZpZy5jb25zb2xlVGFnICsgXCIgW1wiICsgY3VzdG9tVGFnICsgXCJdXCI7XG5cbiAgIHZhciBsb2dNc2cgPSBjdXN0b21UYWcgKyBcIjogXCIgKyBtZXNzYWdlO1xuXG4gICB0aGlzLnByaXZhdGVIZWxwZXJzLmV4ZWNOYXRpdmVDYWxsKHRoaXMuZXJyb3JNZXRob2REZWZpbml0aW9uLCBsb2dNc2cpO1xuICAgY29uc29sZS5lcnJvcihsb2dNc2cpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGxvZ2dlcjtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgQ29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnL2NvbmZpZycpO1xudmFyIEhlbHBlcnMgPSByZXF1aXJlKCcuL2hlbHBlcnMnKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcicpO1xudmFyIFByaXZhdGVIZWxwZXJzID0gcmVxdWlyZSgnLi9wcml2YXRlLWhlbHBlcnMnKTtcbnZhciBTaGFyZWQgPSByZXF1aXJlKCcuL3NoYXJlZCcpO1xuXG5cbi8vIHByaXZhdGUgdmFyc1xudmFyIG5hdGl2ZUNhbGxiYWNrRnVuY3Rpb25zID0ge307XG52YXIgcHJpdmF0ZUhlbHBlcnM7XG5cbi8qKlxuKiBUaGUgUGVha0NvcmUgY2xhc3MgaXMgdXNlZCB0byBjb21tdW5pY2F0ZSBiZXR3ZWVuIGEgSlMgY29udGV4dCBhbmQgYSBuYXRpdmUgaU9TIG9yIEFuZHJvaWQgYXBwLlxuKiBAcmV0dXJuIHtQZWFrQ29yZX0gICAgICBQZWFrQ29yZSBpbnN0YW5jZVxuKi9cbnZhciBDb3JlID0gZnVuY3Rpb24gUGVha0NvcmUoKSB7XG5cblx0Ly8gaW5pdGlhbGl6ZSB0aGUgcHJpdmF0ZSBoZWxwZXJzXG5cdHByaXZhdGVIZWxwZXJzID0gbmV3IFByaXZhdGVIZWxwZXJzKHRoaXMsIHt9KVxuXG5cdC8vIGluaXRpYWxpemUgdGhlIHByb3BlcnR5IHRoYXQgaG9sZHMgaW5zdGFsbGVkIHBlYWsgbW9kdWxlcy5cblx0dGhpcy5tb2R1bGVzID0ge307XG5cdHRoaXMubW9kdWxlc1tcInBlYWtDb3JlXCJdID0ge31cblxuXHQvKipcblx0KiBUaGUgY29uZmlndXJhdGlvbiBvYmplY3Rcblx0KiBAdHlwZSB7b2JqZWN0fVxuXHQqL1xuXHR0aGlzLmNvbmZpZyA9IENvbmZpZztcblxuXHQvKipcblx0KiBIZWxwZXJzIG9iamVjdFxuXHQqIEB0eXBlIHtvYmplY3R9XG5cdCovXG5cdHRoaXMuaGVscGVycyA9IEhlbHBlcnM7XG5cblx0LyoqXG5cdCogQSBMb2dnZXIgaW5zdGFuY2UgZm9yIGxvZ2dpbmcgbWVzc2FnZXMgdG8gdGhlIG5hdGl2ZSBjb25zb2xlXG5cdCogQHR5cGUge0xvZ2dlcn1cblx0Ki9cblx0dGhpcy5sb2dnZXIgPSBuZXcgTG9nZ2VyKHRoaXMscHJpdmF0ZUhlbHBlcnMpO1xuXG5cdC8qKlxuXHQqIENvbnZlbmllbnQgbWV0aG9kIHRvIGxvZyBhbiBpbmZvIG1lc3NhZ2UuXG5cdCogQHR5cGUge0Z1bmN0aW9ufVxuXHQqL1xuXHR0aGlzLmluZm8gPSB0aGlzLmxvZ2dlci5pbmZvLmJpbmQodGhpcy5sb2dnZXIpO1xuXG5cdC8qKlxuXHQqIENvbnZlbmllbnQgbWV0aG9kIHRvIGxvZyBhbiBlcnJvciBtZXNzYWdlLlxuXHQqIEB0eXBlIHtGdW5jdGlvbn1cblx0Ki9cblx0dGhpcy5lcnJvciA9IHRoaXMubG9nZ2VyLmVycm9yLmJpbmQodGhpcy5sb2dnZXIpO1xuXG5cblx0LyoqXG5cdCogVGVsbCB0aGUgbmF0aXZlIHNpZGUgdGhhdCBhbiBhcmJpdHJpYXJ5IG1vZHVsZSBpcyBsb2FkZWQuIChVc3VhbGx5IHVzZWQgb24gbmF0aXZlIHNpZGUgdG8gZGlzcGxheSB0aGUgV2ViVmlldylcblx0KiBNdXN0IGJlIGNhbGxlZCBleHBsaWNpdGx5IGZyb20geW91ciBQZWFrIEFwcCBieSBjYWxsaW5nIHBlYWsub25SZWFkeSgpXG5cdCovXG5cdHRoaXMub25SZWFkeSA9IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuY2FsbE5hdGl2ZSgncGVha0NvcmUnLCAnb25SZWFkeScpO1xuXHR9XG5cblx0dmFyIHRoYXQgPSB0aGlzO1xuXHQvLyBpbml0aWFsaXplIHRoZSBKYXZhU2NyaXB0IE1ldGhvZHMgb2YgUGVhayBDb3JlIE1vZHVsZVxuXHR0aGlzLm1vZHVsZXNbXCJwZWFrQ29yZVwiXS5lbmFibGVEZWJ1ZyA9IGZ1bmN0aW9uKHN0YXRlKSB7XG5cdFx0dGhhdC5jb25maWcuZGVidWcgPSBzdGF0ZTtcblx0fVxuXG59XG5cbkNvcmUucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbihpbml0aWFsaXplZENhbGxiYWNrKSB7XG5cblxuXHRwcml2YXRlSGVscGVycy5pbml0aWFsaXplZENhbGxiYWNrID0gaW5pdGlhbGl6ZWRDYWxsYmFjaztcblxuXHQvKipcblx0KiBBIFNoYXJlZCBkYXRhc3RvcmUuXG5cdCogQHR5cGUge1NoYXJlZH1cblx0Ki9cblx0dGhpcy5zaGFyZWQgPSBuZXcgU2hhcmVkKHRoaXMpO1xuXG5cdC8qKlxuXHQqIENvbnZlbmllbnQgbWV0aG9kIHRvIHNldCBhIHZhbHVlIGludG8gdGhlIHNoYXJlZCBkYXRhc3RvcmUuXG5cdCogQHR5cGUge1t0eXBlXX1cblx0Ki9cblx0dGhpcy5zZXQgPSB0aGlzLnNoYXJlZC5zZXQuYmluZCh0aGlzLnNoYXJlZCk7XG5cblxuXHQvKipcblx0KiBDb252ZW5pZW50IG1ldGhvZCB0byBnZXQgYSB2YWx1ZSBpbnRvIHRoZSBzaGFyZWQgZGF0YXN0b3JlLlxuXHQqIEB0eXBlIHtbdHlwZV19XG5cdCovXG5cdHRoaXMuZ2V0ID0gdGhpcy5zaGFyZWQuZ2V0LmJpbmQodGhpcy5zaGFyZWQpO1xuXG5cblx0LyoqXG5cdCogQ29udmVuaWVudCBtZXRob2QgdG8gc2V0IGEgdmFsdWUgaW50byB0aGUgc2hhcmVkIGRhdGFzdG9yZS4gVGhpcyB2YWx1ZSB3aWxsIGJlIHdyaXR0ZW4gdG8gdGhlIGRpc2suXG5cdCogQHR5cGUge1t0eXBlXX1cblx0Ki9cblx0dGhpcy5zZXRQZXJzaXN0ZW50ID0gdGhpcy5zaGFyZWQuc2V0UGVyc2lzdGVudC5iaW5kKHRoaXMuc2hhcmVkKTtcblxuXG5cdC8qKlxuXHQqIENvbnZlbmllbnQgbWV0aG9kIHRvIHNldCBhIHZhbHVlIGludG8gdGhlIHNoYXJlZCBkYXRhc3RvcmUuIFRoaXMgdmFsdWUgd2lsbCBiZSB3cml0dGVuIGFuZCBlbmNyeXB0ZWQgdG8gdGhlIGRpc2suXG5cdCogQHR5cGUge1t0eXBlXX1cblx0Ki9cblx0dGhpcy5zZXRQZXJzaXN0ZW50U2VjdXJlID0gdGhpcy5zaGFyZWQuc2V0UGVyc2lzdGVudFNlY3VyZS5iaW5kKHRoaXMuc2hhcmVkKTtcblxuXHQvLyBJbml0aWFsaXplIHRoZSBTaGFyZWQgY2xhc3Ncblx0dGhpcy5zaGFyZWQuaW5pdGlhbGl6ZSgpO1xufVxuXG5cbi8qKlxuKiBNYWtlcyB0aGlzIFBlYWtDb3JlIGluc3RhbmNlIGF2YWlsYWJsZSBpbiB0aGUgd2luZG93LlxuKi9cbkNvcmUucHJvdG90eXBlLm1ha2VHbG9iYWwgPSBmdW5jdGlvbih2YXJOYW1lKSB7XG5cdGlmICh3aW5kb3cpXG5cdFx0d2luZG93W3Zhck5hbWVdID0gdGhpcztcbn1cblxuLyoqXG4qIFJlZ2lzdGVyZXMgYSBQZWFrTW9kdWxlIHdpdGggdGhpcyBQZWFrQ29yZSBpbnN0YW5jZS5cbiogQHBhcmFtICB7T2JqZWN0fSBNb2R1bGVDbGFzcyBUaGUgbW9kdWxlIGNsYXNzIHRvIGJlIGluc3RhbnRpYXRlZCBhbmQgcmVnaXN0ZXJlZFxuKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICAgICAgIEFuIGluc3RhbmNlIG9mIHRoZSBnaXZlbiBtb2R1bGUuXG4qL1xuQ29yZS5wcm90b3R5cGUudXNlTW9kdWxlID0gZnVuY3Rpb24oTW9kdWxlQ2xhc3MsIGN1c3RvbURhdGEpIHtcblxuXHRpZiAoTW9kdWxlQ2xhc3MgPT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuZXJyb3IoXCJDYW5ub3QgaW5zdGFsbCB1bmRlZmluZWQgUGVha01vZHVsZVwiKTtcblx0XHRyZXR1cm47XG5cdH1cblxuXHR2YXIgbW9kdWxlID0gbmV3IE1vZHVsZUNsYXNzKHRoaXMsIGN1c3RvbURhdGEpO1xuXG5cblx0aWYgKG1vZHVsZS5wYWNrYWdlSlNPTiA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5lcnJvcihcIk1vZHVsZSBoYXMgbm8gcGFja2FnZUpTT04gcHJvcGVydHkgZGVmaW5lZCFcIik7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdHZhciBwYWNrYWdlSlNPTiA9IG1vZHVsZS5wYWNrYWdlSlNPTjtcblxuXHRpZiAodHlwZW9mKG1vZHVsZS5jb25maWcpID09ICd1bmRlZmluZWQnKSB7XG5cdFx0bW9kdWxlLmNvbmZpZyA9IHRoaXMuY29uZmlnLmRlZmF1bHRNb2R1bGVDb25maWc7XG5cdH1lbHNle1xuXHRcdGZvcih2YXIga2V5IGluIHRoaXMuY29uZmlnLmRlZmF1bHRNb2R1bGVDb25maWcpe1xuXHRcdFx0aWYoKGtleSBpbiBtb2R1bGUuY29uZmlnKSA9PSBmYWxzZSl7XG5cdFx0XHRcdG1vZHVsZS5jb25maWdba2V5XSA9IHRoaXMuY29uZmlnLmRlZmF1bHRNb2R1bGVDb25maWdba2V5XTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHR2YXIgcGFja2FnZUpTT04gPSBtb2R1bGUucGFja2FnZUpTT047XG5cblx0Ly8gZ2V0IHRoZSBwbGFpbiBtb2R1bGUgbmFtZSB3aXRob3V0IFwiQGJpdG1lY2hhbmljcy9cIi5cblx0dmFyIG1vZHVsZU5hbWUgPSBwYWNrYWdlSlNPTi5uYW1lLnJlcGxhY2UoXCJAYml0bWVjaGFuaWNzL1wiLCBcIlwiKTtcblxuXHQvL2NvbnZlcnQgY2FtZSB0byBjYW1lbENhc2UuXG5cdHZhciBtb2R1bGVOYW1lQ2FtZWxDYXNlID0gcHJpdmF0ZUhlbHBlcnMudG9DYW1lbENhc2UobW9kdWxlTmFtZSk7XG5cblx0Ly8gZXh0cmEgdmFyIGZvciBhIG1vcmUgcmVhZGFibGUgY29kZS4gVGhlIG1vZHVsZSBuYW1lc3BhY2UgaXMgdGhlIGNhbWVsQ2FzZSB2ZXJzaW9uIG9mIHRoZSBtb2R1bGUgbmFtZS5cblx0dmFyIG1vZHVsZU5hbWVTcGFjZSA9IG1vZHVsZU5hbWVDYW1lbENhc2U7XG5cblx0aWYgKG1vZHVsZU5hbWVDYW1lbENhc2UgaW4gdGhpcy5tb2R1bGVzKSB7XG5cdFx0dGhpcy5pbmZvKFwiTW9kdWxlIFwiICsgbW9kdWxlTmFtZSArIFwiIHdhcyBpbnN0YWxsZWQgYWxyZWFkeSFcIik7XG5cdFx0cmV0dXJuIHRoaXMubW9kdWxlc1ttb2R1bGVOYW1lU3BhY2VdO1xuXHR9XG5cblx0aWYgKG1vZHVsZS5uYXRpdmVNZXRob2RzID09PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLmVycm9yKFwiTW9kdWxlIFwiICsgbW9kdWxlTmFtZSArIFwiIGhhcyBubyBuYXRpdmVNZXRob2RzIHByb3BlcnR5IVwiKTtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRpZiAobW9kdWxlLkpTTWV0aG9kcyA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5lcnJvcihcIk1vZHVsZSBcIiArIG1vZHVsZU5hbWUgKyBcIiBoYXMgbm8gSlNNZXRob2RzIHByb3BlcnR5IVwiKTtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRtb2R1bGUuX2NhbGxOYXRpdmUgPSBmdW5jdGlvbihmdW5jdGlvbk5hbWUsIHBheWxvYWQsIGNhbGxiYWNrKSB7XG5cdFx0dGhpcy5wZWFrLmNhbGxOYXRpdmUobW9kdWxlTmFtZVNwYWNlLCBmdW5jdGlvbk5hbWUsIHBheWxvYWQsIGNhbGxiYWNrKTtcblx0fTtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IG1vZHVsZS5uYXRpdmVNZXRob2RzLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGRlZmluaXRpb24gPSBtb2R1bGUubmF0aXZlTWV0aG9kc1tpXTtcblx0XHRpZiAodHlwZW9mKGRlZmluaXRpb24ubmFtZXNwYWNlKSA9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0ZGVmaW5pdGlvbi5uYW1lc3BhY2UgPSBtb2R1bGVOYW1lU3BhY2U7XG5cdFx0fVxuXHRcdC8vYWRkIGZ1bmN0aW9uIHN0dWJzIHRvIG1vZHVsZSB0byBlYXNlIGNhbGxpbmcgbmF0aXZlIGZ1bmN0aW9ucyB3aXRoIGRvdC1ub3RhdGlvblxuXHRcdGlmKG1vZHVsZS5jb25maWcuZ2VuZXJhdGVGdW5jdGlvblN0dWJzID09IHRydWUpe1xuXHRcdFx0bW9kdWxlW2RlZmluaXRpb24ubmFtZV0gPSBmdW5jdGlvbihmdW5jTmFtZSl7XG5cdFx0XHRcdHJldHVybiAgZnVuY3Rpb24ocGF5bG9hZCwgY2FsbGJhY2spe1xuXHRcdFx0XHRcdG1vZHVsZS5fY2FsbE5hdGl2ZShmdW5jTmFtZSxwYXlsb2FkLGNhbGxiYWNrKTtcblx0XHRcdFx0fTtcblx0XHRcdH0oZGVmaW5pdGlvbi5uYW1lKTtcblx0XHR9XG5cdH1cblx0dmFyIG5hdGl2ZU1ldGhvZHNPYmogPSB7fTtcblx0bmF0aXZlTWV0aG9kc09ialttb2R1bGVOYW1lU3BhY2VdID0gbW9kdWxlLm5hdGl2ZU1ldGhvZHM7XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBtb2R1bGUuSlNNZXRob2RzLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGRlZmluaXRpb24gPSBtb2R1bGUuSlNNZXRob2RzW2ldO1xuXHRcdGlmICh0eXBlb2YoZGVmaW5pdGlvbi5uYW1lc3BhY2UpID09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRkZWZpbml0aW9uLm5hbWVzcGFjZSA9IG1vZHVsZU5hbWVTcGFjZTtcblx0XHR9XG5cdFx0aWYgKG1vZHVsZS5jb25maWcuc2tpcEpTTWV0aG9kVmFsaWRhdGlvbk9uSW5zdGFsbCA9PSBmYWxzZSkge1xuXHRcdFx0aWYgKHR5cGVvZihtb2R1bGVbZGVmaW5pdGlvbi5uYW1lXSkgPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFx0dGhpcy5lcnJvcihkZWZpbml0aW9uLm5hbWUgKyBcIiBpcyBub3QgaW1wbGVtZW50ZWQgaW4gbW9kdWxlIFwiICsgbW9kdWxlTmFtZVNwYWNlKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0dmFyIEpTTWV0aG9kc09iaiA9IHt9O1xuXHRKU01ldGhvZHNPYmpbbW9kdWxlTmFtZVNwYWNlXSA9IG1vZHVsZS5KU01ldGhvZHM7XG5cblxuXHQvLyBhZGQgdGhlIG1vZHVsZSBtZXRob2QgZGVmaW5pdGlvbnMgdG8gdGhlIGNvbmZpZyBvYmplY3Rcblx0dGhpcy5jb25maWcubmF0aXZlTWV0aG9kcyA9IHByaXZhdGVIZWxwZXJzLm1lcmdlT2JqZWN0KHRoaXMuY29uZmlnLm5hdGl2ZU1ldGhvZHMsIG5hdGl2ZU1ldGhvZHNPYmopO1xuXHR0aGlzLmNvbmZpZy5KU01ldGhvZHMgPSBwcml2YXRlSGVscGVycy5tZXJnZU9iamVjdCh0aGlzLmNvbmZpZy5KU01ldGhvZHMsIEpTTWV0aG9kc09iaik7XG5cblx0aWYgKHRoaXMuY29uZmlnLmRlYnVnKSB7XG5cdFx0dGhpcy5pbmZvKFwibmF0aXZlTWV0aG9kczogXCIgKyBKU09OLnN0cmluZ2lmeSh0aGlzLmNvbmZpZy5uYXRpdmVNZXRob2RzLCBudWxsLCA0KSk7XG5cdFx0dGhpcy5pbmZvKFwiSlNNZXRob2RzOiBcIiArIEpTT04uc3RyaW5naWZ5KHRoaXMuY29uZmlnLkpTTWV0aG9kcywgbnVsbCwgNCkpO1xuXG5cdFx0dmFyIGluZm9Nc2cgPSBcIk1vZHVsZSBcIiArIG1vZHVsZU5hbWUgKyBcIiB3aXRoIHZlcnNpb24gXCIgKyBwYWNrYWdlSlNPTi52ZXJzaW9uICsgXCIgd2FzIGluc3RhbGxlZFxcblwiXG5cdFx0KyAnd2l0aCBjb25maWd1cmF0aW9uOiAnICsgSlNPTi5zdHJpbmdpZnkobW9kdWxlLmNvbmZpZyxudWxsLDQpO1xuXG5cdFx0dGhpcy5pbmZvKGluZm9Nc2cpO1xuXHR9XG5cblxuXHRtb2R1bGUuX2luZm8gPSBmdW5jdGlvbihtc2cpIHtcblx0XHR0aGlzLnBlYWsuaW5mbyhtc2csbW9kdWxlTmFtZSArIFwiKFwiICsgcGFja2FnZUpTT04udmVyc2lvbiArIFwiKVwiKTtcblx0fTtcblxuXHRtb2R1bGUuX2Vycm9yID0gZnVuY3Rpb24obXNnKSB7XG5cdFx0dGhpcy5wZWFrLmVycm9yKG1zZyxtb2R1bGVOYW1lICsgXCIoXCIgKyBwYWNrYWdlSlNPTi52ZXJzaW9uICsgXCIpXCIpO1xuXHR9O1xuXG5cdG1vZHVsZS5uYW1lID0gbW9kdWxlTmFtZTtcblx0bW9kdWxlLm5hbWVzcGFjZSA9IG1vZHVsZU5hbWVTcGFjZTtcblxuXHR0aGlzLm1vZHVsZXNbbW9kdWxlTmFtZVNwYWNlXSA9IG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlO1xufVxuXG4vKipcbiogY2FsbEpTIGlzIHVzZWQgYnkgdGhlIG5hdGl2ZSBzaWRlIHRvIGNhbGwgYSBtZXRob2QgaW4gSlMuXG4qIEBwYXJhbSAge3N0cmluZ30gbmFtZXNwYWNlIFx0ICBUaGUgbmFtZXNwYWNlIG9mIHRoZSBKUyBmdW5jdGlvbiB0byBjYWxsLlxuKiBAcGFyYW0gIHtzdHJpbmd9IGZ1bmN0aW9uTmFtZSAgIE5hbWUgb2YgdGhlIEpTIGZ1bmN0aW9uLlxuKiBAcGFyYW0gIHthbnl9IHBheWxvYWQgICAgICAgICAgIFBheWxvYWQgdG8gZGVsaXZlciB0byB0aGUgZnVuY3Rpb24uXG4qIEBwYXJhbSAge3N0cmluZ30gbmF0aXZlQ2FsbGJhY2sgRnVuY3Rpb24gbmFtZSBvZiB0aGUgbmF0aXZlIGNhbGxiYWNrLiAoT25seSByZXF1aXJlZCBvbiBBbmRyb2lkKVxuKi9cbkNvcmUucHJvdG90eXBlLmNhbGxKUyA9IGZ1bmN0aW9uKG5hbWVzcGFjZSwgZnVuY3Rpb25OYW1lLCBwYXlsb2FkLCBuYXRpdmVDYWxsYmFjaykge1xuXG5cdGlmICh0aGlzLmNvbmZpZy5kZWJ1Zykge1xuXHRcdHRoaXMuaW5mbyhcIkpTIGZ1bmN0aW9uIFwiICsgbmFtZXNwYWNlICsgXCIvXCIgKyBmdW5jdGlvbk5hbWUgKyBcIiBjYWxsZWQuXCIpO1xuXHR9XG5cblx0aWYgKHByaXZhdGVIZWxwZXJzLmlzTW9kdWxlSW5zdGFsbGVkKG5hbWVzcGFjZSkgPT0gZmFsc2UpIHtcblx0XHR0aGlzLmVycm9yKFwiTW9kdWxlIFwiICsgbmFtZXNwYWNlICsgXCIgaXMgbm90IGluc3RhbGxlZC5cIilcblx0XHRyZXR1cm47XG5cdH1cblxuXHQvL0dldCBKUyBtZXRob2QgZGVmaW5pdGlvblxuXHR2YXIgSlNNZXRob2REZWZpbml0aW9uID0gdGhpcy5nZXRKU01ldGhvZERlZmluaXRpb24obmFtZXNwYWNlLCBmdW5jdGlvbk5hbWUpO1xuXG5cdC8vIGlzIG1ldGhvZCBkZWZpbmVkIGluIGNvbmZpZz9cblx0aWYgKEpTTWV0aG9kRGVmaW5pdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5lcnJvcihuYW1lc3BhY2UgKyBcIi9cIiArIGZ1bmN0aW9uTmFtZSArIFwiKCkgaXMgbm90IGltcGxlbWVudGVkIGluIEphdmFTY3JpcHQgQ29kZSFcIik7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0Ly8gaXMgcGF5bG9hZCB0eXBlIGNvcnJlY3Q/IChwYXlsb2FkIHR5cGVzIGZvciBmdW5jdGlvbnMgYXJlIGRlZmluZWQgaW4gdGhlIGNvbmZpZyBvYmplY3QpXG5cdGlmIChwcml2YXRlSGVscGVycy5pc05hdGl2ZU1ldGhvZFBheWxvYWRWYWxpZChKU01ldGhvZERlZmluaXRpb24sIHBheWxvYWQpID09IGZhbHNlKSB7XG5cdFx0dGhpcy5lcnJvcihuYW1lc3BhY2UgKyBcIi9cIiArIGZ1bmN0aW9uTmFtZSArIFwiKCkgcGF5bG9hZCBub3QgdmFsaWQhXCIpO1xuXHRcdHJldHVybjtcblx0fVxuXG5cdHZhciBtb2R1bGUgPSB0aGlzLm1vZHVsZXNbbmFtZXNwYWNlXTtcblxuXHR2YXIgY2FsbGJhY2tEYXRhID0gbW9kdWxlW2Z1bmN0aW9uTmFtZV0ocGF5bG9hZCk7XG5cblx0Ly8gc2tpcCB0aGUgcmVzdCBpZiB3ZSBkb250IG5lZWQgYSBjYWxsYmFja1xuXHRpZiAodHlwZW9mKEpTTWV0aG9kRGVmaW5pdGlvbi5jYWxsYmFjaykgPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRpZiAocHJpdmF0ZUhlbHBlcnMuaXNDYWxsYmFja0RhdGFWYWxpZEZvck1ldGhvZERlZmluaXRpb24oSlNNZXRob2REZWZpbml0aW9uLCBjYWxsYmFja0RhdGEpID09IGZhbHNlKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0aWYoY2FsbGJhY2tEYXRhICE9PSB1bmRlZmluZWQpe1xuXHRcdGlmICh0aGlzLmhlbHBlcnMuaXNpT1MoKSkge1xuXHRcdFx0cmV0dXJuIGNhbGxiYWNrRGF0YTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYodGhpcy5jb25maWcuZGVidWcpe1xuXHRcdFx0XHR0aGlzLmluZm8oXCJBbmRyb2lkIE5hdGl2ZSBDYWxsYmFjayBcIiArIG5hdGl2ZUNhbGxiYWNrICtcIigpIGNhbGxlZC4gV2l0aCBkYXRhOiBcIiArIEpTT04uc3RyaW5naWZ5KGNhbGxiYWNrRGF0YSxudWxsLDQpKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gZXhlY3V0ZSB0aGUgbmF0aXZlIGNhbGxcblx0XHRcdC8vU2V0IHVuaXZlcnNhbCBjYWxsYmFjayBuYW1lIGluIEFuZHJvaWRcblx0XHRcdEpTTWV0aG9kRGVmaW5pdGlvbi5jYWxsYmFjay5uYW1lID0gXCJpbnZva2VOYXRpdmVDYWxsYmFja1wiO1xuXHRcdFx0cHJpdmF0ZUhlbHBlcnMuZXhlY05hdGl2ZUNhbGwoSlNNZXRob2REZWZpbml0aW9uLCBjYWxsYmFja0RhdGEsIGNhbGxiYWNrS2V5KTtcblx0XHR9XG5cblx0fVxuXG59XG5cbi8qKlxuKiBUaGlzIGZ1bmN0aW9uIGlzIHVzZWQgYnkgdGhlIG5hdGl2ZSBzaWRlIHRvIGludm9jZSBhIGNhbGxiYWNrIGZ1bmN0aW9uLlxuKiBAcGFyYW0gIHtzdHJpbmd9IGNhbGxiYWNrRnVuY3Rpb25OYW1lIFRoZSBmdW5jdGlvbiBuYW1lIG9mIHRoZSBjYWxsYmFja1xuKiBAcGFyYW0gIHthbnl9IGpzb25EYXRhICAgICBQYXlsb2FkIG9mIHRoZSBjYWxsYmFjay5cbiovXG5Db3JlLnByb3RvdHlwZS5jYWxsQ2FsbGJhY2sgPSBmdW5jdGlvbihjYWxsYmFja0Z1bmN0aW9uTmFtZSwganNvbkRhdGEpIHtcblxuXHRpZiAodGhpcy5jb25maWcuZGVidWcpIHtcblx0XHRpZih0eXBlb2YoanNvbkRhdGEpID09ICdvYmplY3QnKXtcblx0XHRcdHRoaXMuaW5mbyhcIkpTIGNhbGxiYWNrICdcIiArIGNhbGxiYWNrRnVuY3Rpb25OYW1lICsgXCInJyBjYWxsZWQuIFdpdGggZGF0YTogXCIgKyBKU09OLnN0cmluZ2lmeShqc29uRGF0YSxudWxsLDQpKTtcblx0XHR9ZWxzZXtcblx0XHRcdHRoaXMuaW5mbyhcIkpTIGNhbGxiYWNrICdcIiArIGNhbGxiYWNrRnVuY3Rpb25OYW1lICsgXCInIGNhbGxlZC4gV2l0aCBkYXRhOiBcIiArIGpzb25EYXRhKTtcblx0XHR9XG5cdH1cblxuXHRpZiAoY2FsbGJhY2tGdW5jdGlvbk5hbWUgaW4gbmF0aXZlQ2FsbGJhY2tGdW5jdGlvbnMpIHtcblxuXHRcdHZhciBjYWxsYmFja0Z1bmN0aW9uID0gbmF0aXZlQ2FsbGJhY2tGdW5jdGlvbnNbY2FsbGJhY2tGdW5jdGlvbk5hbWVdLmNhbGxiYWNrRnVuY3Rpb247XG5cdFx0dmFyIGNhbGxlckZ1bmN0aW9uTmFtZSA9IG5hdGl2ZUNhbGxiYWNrRnVuY3Rpb25zW2NhbGxiYWNrRnVuY3Rpb25OYW1lXS5jYWxsZXJGdW5jdGlvbk5hbWU7XG5cdFx0dmFyIGNhbGxlck5hbWVzcGFjZSA9IG5hdGl2ZUNhbGxiYWNrRnVuY3Rpb25zW2NhbGxiYWNrRnVuY3Rpb25OYW1lXS5jYWxsZXJOYW1lc3BhY2U7XG5cblx0XHR2YXIgbWV0aG9kID0gdGhpcy5nZXROYXRpdmVNZXRob2REZWZpbml0aW9uKGNhbGxlck5hbWVzcGFjZSwgY2FsbGVyRnVuY3Rpb25OYW1lKTtcblxuXHRcdGlmIChwcml2YXRlSGVscGVycy5pc0NhbGxiYWNrRGF0YVZhbGlkRm9yTWV0aG9kRGVmaW5pdGlvbihtZXRob2QsIGpzb25EYXRhKSA9PSBmYWxzZSkge1xuXHRcdFx0dGhpcy5lcnJvcihjYWxsZXJGdW5jdGlvbk5hbWUgKyBcIigpIGNhbGxiYWNrIGRhdGEgZG9lcyBub3QgbWF0Y2ggZGVmaW5pdGlvbiFcIik7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y2FsbGJhY2tGdW5jdGlvbihqc29uRGF0YSk7XG5cblx0XHQvL0ZyZWUgbWVtb3J5XG5cdFx0ZGVsZXRlIG5hdGl2ZUNhbGxiYWNrRnVuY3Rpb25zW2NhbGxiYWNrRnVuY3Rpb25OYW1lXTtcblxuXHR9IGVsc2Uge1xuXHRcdHRoaXMuZXJyb3IoY2FsbGJhY2tGdW5jdGlvbk5hbWUgKyBcIigpIGNhbGxiYWNrIG5vdCBkZWZpbmVkIVwiKTtcblx0fVxufTtcblxuXG4vKipcbiogY2FsbE5hdGl2ZSBpcyB1c2VkIHRvIGNhbGwgYSBuYXRpdmUgZnVuY3Rpb24gZnJvbSBKUy5cbiogQHBhcmFtICB7c3RyaW5nfSAgIG5hbWVzcGFjZSBvciBtb2R1bGUgbmFtZSBvZiB0aGUgaGFuZGxpbmcgbW9kdWxlXG4qIEBwYXJhbSAge3N0cmluZ30gICBmdW5jdGlvbk5hbWUgTmFtZSBvZiB0aGUgbmF0aXZlIGZ1bmN0aW9uLlxuKiBAcGFyYW0gIHthbnl9ICAgcGF5bG9hZCAgICAgIFBheWxvYWQgdG8gZGVsaXZlciB0byB0aGUgbmF0aXZlIGZ1bmN0aW9uXG4qIEBwYXJhbSAge0Z1bmN0aW9ufSBjYWxsYmFjayAgICAgSlMgY2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSByZXR1cm4gdmFsdWVzIGZyb20gbmF0aXZlLlxuKi9cbkNvcmUucHJvdG90eXBlLmNhbGxOYXRpdmUgPSBmdW5jdGlvbihuYW1lc3BhY2UsIGZ1bmN0aW9uTmFtZSwgcGF5bG9hZCwgY2FsbGJhY2spIHtcblxuXHRpZiAodGhpcy5jb25maWcuZGVidWcpIHtcblx0XHR0aGlzLmluZm8oXCJOYXRpdmUgZnVuY3Rpb24gXCIgKyBuYW1lc3BhY2UgKyBcIi9cIiArIGZ1bmN0aW9uTmFtZSArIFwiKCkgY2FsbGVkLlwiKTtcblx0fVxuXG5cdC8vR2V0IG5hdGl2ZSBtZXRob2QgZGVmaW5pdGlvblxuXHR2YXIgbmF0aXZlTWV0aG9kRGVmaW5pdGlvbiA9IHRoaXMuZ2V0TmF0aXZlTWV0aG9kRGVmaW5pdGlvbihuYW1lc3BhY2UsIGZ1bmN0aW9uTmFtZSk7XG5cblx0Ly8gaXMgbWV0aG9kIGRlZmluZWQ/XG5cdGlmIChuYXRpdmVNZXRob2REZWZpbml0aW9uID09PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLmVycm9yKG5hbWVzcGFjZSArIFwiL1wiICsgZnVuY3Rpb25OYW1lICsgXCIoKSBpcyBub3QgYSBkZWZpbmVkIG1ldGhvZC5cIik7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblxuXHRpZiAodHlwZW9mIHBheWxvYWQgPT09ICdmdW5jdGlvbicpIHtcblx0XHRjYWxsYmFjayA9IHBheWxvYWQ7XG5cdFx0cGF5bG9hZCA9IG51bGw7XG5cdH1cblxuXHQvLyBpcyBwYXlsb2FkIHR5cGUgY29ycmVjdD9cblx0aWYgKHByaXZhdGVIZWxwZXJzLmlzTmF0aXZlTWV0aG9kUGF5bG9hZFZhbGlkKG5hdGl2ZU1ldGhvZERlZmluaXRpb24sIHBheWxvYWQpID09IGZhbHNlKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblxuXHRpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuXHRcdC8vR2VuZXJhdGUgdGVtcG9yYXJ5IGtleSBmb3IgY2FsbGJhY2sgZnVuY3Rpb25cblx0XHR2YXIgY2FsbGJhY2tLZXkgPSBwcml2YXRlSGVscGVycy5nZW5lcmF0ZUlkKCk7XG5cdFx0bmF0aXZlQ2FsbGJhY2tGdW5jdGlvbnNbY2FsbGJhY2tLZXldID0ge1xuXHRcdFx0Y2FsbGVyTmFtZXNwYWNlOiBuYW1lc3BhY2UsXG5cdFx0XHRjYWxsZXJGdW5jdGlvbk5hbWU6IGZ1bmN0aW9uTmFtZSxcblx0XHRcdGNhbGxiYWNrRnVuY3Rpb246IGNhbGxiYWNrXG5cdFx0fTtcblx0fVxuXG5cdHByaXZhdGVIZWxwZXJzLmV4ZWNOYXRpdmVDYWxsKG5hdGl2ZU1ldGhvZERlZmluaXRpb24sIHBheWxvYWQsIGNhbGxiYWNrS2V5KTtcbn07XG5cbi8qKlxuKiBHZXRzIHRoZSBuYXRpdmUgbWV0aG9kIGRlZmluaXRpb24gZm9yIGEgZ2l2ZW4gZnVuY3Rpb24gbmFtZS4gKE1ldGhvZCBkZWZpbml0aW9ucyBhcmUgZGVmaW5lZCBpbiB0aGUgY29uZmlnIG9iamVjdClcbiogQHBhcmFtICB7c3RyaW5nfSBmdW5jdGlvbk5hbWUgVGhlIG5hbWUgb2YgdGhlIGZ1bmN0aW9uIHdob3MgZGVmaW5pdGlvbiBoYXMgdG8gYmUgcmV0dXJuZWQuXG4qIEByZXR1cm4ge29iamVjdH0gICAgICAgICAgICAgIEZ1bmN0aW9uIGRlZmluaXRpb24gb3IgdW5kZWZpbmVkIGlmIGZ1bmN0aW9uIG5vdCBmb3VuZC5cbiovXG5Db3JlLnByb3RvdHlwZS5nZXROYXRpdmVNZXRob2REZWZpbml0aW9uID0gZnVuY3Rpb24obmFtZXNwYWNlLCBmdW5jdGlvbk5hbWUpIHtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNvbmZpZy5uYXRpdmVNZXRob2RzW25hbWVzcGFjZV0ubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgbWV0aG9kID0gdGhpcy5jb25maWcubmF0aXZlTWV0aG9kc1tuYW1lc3BhY2VdW2ldO1xuXHRcdGlmIChtZXRob2QubmFtZSA9PSBmdW5jdGlvbk5hbWUpIHtcblx0XHRcdHJldHVybiBtZXRob2Q7XG5cdFx0fVxuXHR9XG5cdHJldHVybiB1bmRlZmluZWQ7XG59O1xuXG5cbi8qKlxuKiBHZXRzIHRoZSBKUyBtZXRob2QgZGVmaW5pdGlvbiBmb3IgYSBnaXZlbiBmdW5jdGlvbiBuYW1lLiAoTWV0aG9kIGRlZmluaXRpb25zIGFyZSBkZWZpbmVkIGluIHRoZSBjb25maWcgb2JqZWN0KVxuKiBAcGFyYW0gIHtzdHJpbmd9IGZ1bmN0aW9uTmFtZSBUaGUgbmFtZSBvZiB0aGUgZnVuY3Rpb24gd2hvcyBkZWZpbml0aW9uIGhhcyB0byBiZSByZXR1cm5lZC5cbiogQHJldHVybiB7b2JqZWN0fSAgICAgICAgICAgICAgRnVuY3Rpb24gZGVmaW5pdGlvbiBvciB1bmRlZmluZWQgaWYgZnVuY3Rpb24gbm90IGZvdW5kLlxuKi9cbkNvcmUucHJvdG90eXBlLmdldEpTTWV0aG9kRGVmaW5pdGlvbiA9IGZ1bmN0aW9uKG5hbWVzcGFjZSwgZnVuY3Rpb25OYW1lKSB7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jb25maWcuSlNNZXRob2RzW25hbWVzcGFjZV0ubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgbWV0aG9kID0gdGhpcy5jb25maWcuSlNNZXRob2RzW25hbWVzcGFjZV1baV07XG5cdFx0aWYgKG1ldGhvZC5uYW1lID09IGZ1bmN0aW9uTmFtZSkge1xuXHRcdFx0cmV0dXJuIG1ldGhvZDtcblx0XHR9XG5cdH1cblx0cmV0dXJuIHVuZGVmaW5lZDtcbn07XG5cbkNvcmUucHJvdG90eXBlLmFkZFN1YmNvbXBvbmVudFRvSW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRwcml2YXRlSGVscGVycy5hZGRTdWJjb21wb25lbnRUb0luaXRpYWxpemUoKTtcbn1cblxuQ29yZS5wcm90b3R5cGUuc3ViY29tcG9uZW50RGlkSW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHRwcml2YXRlSGVscGVycy5zdWJjb21wb25lbnREaWRJbml0aWFsaXplKCk7XG59XG5cblxuLy9cbi8vIEV4cG9ydCB0aGUgUGVha0NvcmUgY2xhc3Ncbm1vZHVsZS5leHBvcnRzID0gQ29yZTtcbiIsIlxuLyoqXG4gKiBBIGNvbGxlY3Rpb24gb2YgcHJpdmF0ZSBoZWxwZXJzIHRvIG9wZXJhdGUgUGVha0NvcmUuXG4gKiBAcGFyYW0ge1BlYWtDb3JlfSBjb3JlICAgICAgICBBIFBlYWtDb3JlIGluc3RhbmNlXG4gKi9cbnZhciBQcml2YXRlSGVscGVycyA9IGZ1bmN0aW9uKHBlYWssIHByaXZhdGVEYXRhKSB7XG4gICB0aGlzLmNvcmUgPSBwZWFrO1xuXG4gICAvLyBUaGlzIGlzIGEgdGVtcG9yYXJ5IGZpeC4gQWZ0ZXIgeCB0aW1lcyB0aGUgc3ViY29tcG9uZW50RGlkSW5pdGlhbGl6ZSgpIG1ldGhvZCBpcyBjYWxsZWQgd2UgYXNzdW1lIFBlYWsgaGFzIGxvYWRlZFxuICAgdGhpcy5udW1PZkNvbXBvbmVudHNUb0luaXRpYWxpemUgPSAwXG4gICB0aGlzLnN1YmNvbXBvbmVudHNEaWRJbml0aWFsaXplID0gMFxufVxuXG4vKipcbiAqIENoZWNrcyBpZiBhIGNlcnRhaW4gbW9kdWxlIHdhcyBpbnN0YWxsZWQgYWxyZWFkeVxuICogQHBhcmFtICB7c3RyaW5nfSAgbmFtZXNwYWNlIFRoZSBuYW1lc3BhY2Ugb2YgdGhlIG1vZHVsZVxuICogQHJldHVybiB7Qm9vbGVhbn0gICAgICAgICAgIFRydWUgb2YgRmFsc2UgaWYgbW9kdWxlcyB3YXMgaW5zdGFsbGVkXG4gKi9cblByaXZhdGVIZWxwZXJzLnByb3RvdHlwZS5pc01vZHVsZUluc3RhbGxlZCA9IGZ1bmN0aW9uIChuYW1lc3BhY2UpIHtcbiAgIHJldHVybiAhKHR5cGVvZih0aGlzLmNvcmUubW9kdWxlc1tuYW1lc3BhY2VdKSA9PSAndW5kZWZpbmVkJylcbn07XG5cblxuXG4vKipcbiAqIENoZWNrcyB3ZXRoZXIgYSBnaXZlbiBwYXlsb2FkIHR5cGUgbWF0Y2hlcyB0aGUgZGVmaW5pdGlvbiBpbiB0aGUgY29uZmlnIG9iamVjdCBmb3IgdGhhdCBtZXRob2QuXG4gKiBAcGFyYW0gIHtvYmplY3R9IG5hdGl2ZU1ldGhvZERlZmluaXRpb24gTWV0aG9kIGRlZmluaXRpb24gb2YgdGhlIG1ldGhvZCB3aGljaCBwYXlsb2FkIGhhcyB0byBiZSBjaGVja2VkLlxuICogQHBhcmFtICB7YW55fSBwYXlsb2FkICAgICAgICAgICAgICAgIFRoZSBwYXlsb2FkIGdpdmVuLlxuICogQHJldHVybiB7Ym9vbGVhbn0gICAgICAgICAgICAgICAgICAgICAgICB0cnVlIG9yIGZhbHNlIHdldGhlciB0aGUgZGVmaW5pdGlvbiBtYXRjaGVzIHRoZSBwYXlsb2FkIG9yIG5vdC5cbiAqL1xuUHJpdmF0ZUhlbHBlcnMucHJvdG90eXBlLmlzTmF0aXZlTWV0aG9kUGF5bG9hZFZhbGlkID0gZnVuY3Rpb24obmF0aXZlTWV0aG9kRGVmaW5pdGlvbiwgcGF5bG9hZCkge1xuXG5cdC8vRG8gbm90IGNoZWNrIGluIHByb2R1Y3Rpb24gbW9kZVxuXHRpZighdGhpcy5jb3JlLmNvbmZpZy5kZWJ1Zyl7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuICAgLy8gaWYgd2UgZG9uJ3Qgc3BlY2lmeSBhIHBheWxvYWRUeXBlIGluIHRoZSBtZXRob2QgZGVmaW5pdGlvbiwgd2Ugc2V0IGl0IHRvIG5vbmUgbWFudWFsbHlcbiAgIGlmICh0eXBlb2YobmF0aXZlTWV0aG9kRGVmaW5pdGlvbi5wYXlsb2FkKSA9PSAndW5kZWZpbmVkJykge1xuICAgICAgbmF0aXZlTWV0aG9kRGVmaW5pdGlvbi5wYXlsb2FkID0ge1xuICAgICAgICAgZGF0YVR5cGU6ICdub25lJ1xuICAgICAgfVxuICAgfVxuXG5cdGlmIChwYXlsb2FkID09IG51bGwpIHtcblx0XHRpZiAgKG5hdGl2ZU1ldGhvZERlZmluaXRpb24ucGF5bG9hZC5kYXRhVHlwZSAhPSAnbm9uZScpIHtcblx0XHRcdHRoaXMuY29yZS5sb2dnZXIuZXJyb3IobmF0aXZlTWV0aG9kRGVmaW5pdGlvbi5uYW1lICsgJyg8JysgdHlwZSArJz4pIFR5cGUgbWlzbWF0Y2guIEV4cGVjdGVkIDwnKyBuYXRpdmVNZXRob2REZWZpbml0aW9uLnBheWxvYWQuZGF0YVR5cGUgKyc+Jyk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblxuXHR2YXIgdHlwZSA9IHR5cGVvZihwYXlsb2FkKTtcblxuXHRpZiAodHlwZSA9PSAnb2JqZWN0JyAmJiBwYXlsb2FkLmxlbmd0aCAhPT0gdW5kZWZpbmVkKSB7IC8vIGlmIGFycmF5XG5cdFx0dHlwZSA9ICdhcnJheSc7XG5cdH1cblxuICAgaWYgKHR5cGUgPT0gJ251bWJlcicgJiYgbmF0aXZlTWV0aG9kRGVmaW5pdGlvbi5wYXlsb2FkLmRhdGFUeXBlID09ICdib29sZWFuJykge1xuICAgICAgcmV0dXJuIHRydWVcbiAgIH1cblxuXHRpZiAodHlwZSAhPSBuYXRpdmVNZXRob2REZWZpbml0aW9uLnBheWxvYWQuZGF0YVR5cGUpIHtcblx0XHR0aGlzLmNvcmUubG9nZ2VyLmVycm9yKG5hdGl2ZU1ldGhvZERlZmluaXRpb24ubmFtZSArICcoPCcrIHR5cGUgKyc+KSBUeXBlIG1pc21hdGNoLiBFeHBlY3RlZCA8JysgbmF0aXZlTWV0aG9kRGVmaW5pdGlvbi5wYXlsb2FkLmRhdGFUeXBlICsnPicpO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8vQ2hlY2sgcGF5bG9hZERhdGEgZm9yIG9iamVjdHNcblx0aWYgKHR5cGUgPT0gJ29iamVjdCcpe1xuXHRcdGlmIChuYXRpdmVNZXRob2REZWZpbml0aW9uLnBheWxvYWQuZGF0YSA9PT0gdW5kZWZpbmVkKXtcblx0XHRcdHRoaXMuY29yZS5sb2dnZXIuZXJyb3IobmF0aXZlTWV0aG9kRGVmaW5pdGlvbi5uYW1lICsgXCJQYXlsb2FkRGF0YSBub3QgZGVjbGFyZWQhXCIpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRmb3IgKHZhciBrZXkgaW4gbmF0aXZlTWV0aG9kRGVmaW5pdGlvbi5wYXlsb2FkLmRhdGEpIHtcblx0XHRcdGlmICgoa2V5IGluIHBheWxvYWQpID09IGZhbHNlKSB7XG5cdFx0XHRcdHRoaXMuY29yZS5sb2dnZXIuZXJyb3IobmF0aXZlTWV0aG9kRGVmaW5pdGlvbi5uYW1lICsgXCJQYXlsb2FkRGF0YSBtaXNtYXRjaCEgRXhwZWN0ZWQgPCdcIiArIGtleSArIFwiJz5cIik7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0fVxuXG5cdH1cblxuXHRyZXR1cm4gdHJ1ZTtcblxufTtcblxuLyoqXG4gKiBDaGVja3Mgd2V0aGVyIHRoZSBnaXZlbiBkYXRhIGZyb20gYSBjYWxsYmFjayBtYXRjaGVzIHRoZSBtZXRob2QgZGVmaW5pdGlvbi5cbiAqIEBwYXJhbSAge29iamVjdH0gSlNNZXRob2REZWZpbml0aW9uIE1ldGhvZCBkZWZpbml0aW9uIGZvciB0aGUgY2FsbGVkIGpzIGZ1bmN0aW9uLlxuICogQHBhcmFtICB7W3R5cGVdfSBqc29uRGF0YSAgICAgICAgIENhbGxiYWNrIHBheWxvYWRcbiAqIEByZXR1cm4ge2Jvb2xlYW59ICAgICAgICAgICAgICAgICAgdHJ1ZSBvciBmYWxzZVxuICovXG5Qcml2YXRlSGVscGVycy5wcm90b3R5cGUuaXNDYWxsYmFja0RhdGFWYWxpZEZvck1ldGhvZERlZmluaXRpb24gPSBmdW5jdGlvbihKU01ldGhvZERlZmluaXRpb24sIGpzb25EYXRhKSB7XG5cblx0Ly9EbyBub3QgY2hlY2sgaW4gcHJvZHVjdGlvbiBtb2RlXG5cdGlmKCF0aGlzLmNvcmUuY29uZmlnLmRlYnVnKXtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdC8vVXNlZCBmb3IgVlVFL0pTIEZ1bmN0aW9ucyB3aXRob3V0IGEgY2FsbGJhY2tcblx0aWYoSlNNZXRob2REZWZpbml0aW9uID09PSB1bmRlZmluZWQgJiYganNvbkRhdGEgPT09IHVuZGVmaW5lZCl7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuICAgdmFyIGNhbGxiYWNrRGVmaW5pdGlvbiA9IEpTTWV0aG9kRGVmaW5pdGlvbi5jYWxsYmFjaztcblxuICAgaWYgKHR5cGVvZihjYWxsYmFja0RlZmluaXRpb24pID09ICd1bmRlZmluZWQnICYmIGpzb25EYXRhKSB7XG4gICAgICB0aGlzLmNvcmUubG9nZ2VyLmVycm9yKEpTTWV0aG9kRGVmaW5pdGlvbi5uYW1lc3BhY2UgKyBcIi9cIiArIEpTTWV0aG9kRGVmaW5pdGlvbi5uYW1lICsgJyBoYXMgbm8gZGVmaW5lZCBjYWxsYmFjayBpbiBpdFxcJ3MgbWV0aG9kIGRlZmluaXRpb24uJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICB9XG5cblx0aWYgKHR5cGVvZihjYWxsYmFja0RlZmluaXRpb24pID09ICd1bmRlZmluZWQnICYmIHR5cGVvZihqc29uRGF0YSkgPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdHZhciB0eXBlID0gdHlwZW9mKGpzb25EYXRhKTtcblx0aWYgKHR5cGUgPT0gJ29iamVjdCcgJiYganNvbkRhdGEubGVuZ3RoICE9PSB1bmRlZmluZWQpIHsgLy8gaWYgYXJyYXlcblx0XHR0eXBlID0gJ2FycmF5Jztcblx0fVxuXG5cdGlmICh0eXBlICE9IGNhbGxiYWNrRGVmaW5pdGlvbi5kYXRhVHlwZSkge1xuXHRcdHRoaXMuY29yZS5sb2dnZXIuZXJyb3IoSlNNZXRob2REZWZpbml0aW9uLm5hbWVzcGFjZSArIFwiL1wiICsgSlNNZXRob2REZWZpbml0aW9uLm5hbWUgKyAnKDwnKyB0eXBlICsnPikgY2FsbGJhY2sgZGF0YSB0eXBlIG1pc21hdGNoLiBFeHBlY3RlZCA8JysgY2FsbGJhY2tEZWZpbml0aW9uLmRhdGFUeXBlICsnPicpO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdGlmKHR5cGUgPT0gJ29iamVjdCcpe1xuXHRcdGZvciAodmFyIGtleSBpbiBjYWxsYmFja0RlZmluaXRpb24uZGF0YSkge1xuXHRcdFx0aWYgKChrZXkgaW4ganNvbkRhdGEpID09IGZhbHNlKSB7XG5cdFx0XHRcdHRoaXMuY29yZS5sb2dnZXIuZXJyb3IoSlNNZXRob2REZWZpbml0aW9uLm5hbWVzcGFjZSArIFwiL1wiICsgSlNNZXRob2REZWZpbml0aW9uLm5hbWUgKyBcIkNhbGxiYWNrRGF0YSBtaXNtYXRjaCEgRXhwZWN0ZWQgPCdcIiArIGtleSArIFwiJz5cIik7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogSW52b2tlcyBhIG5hdGl2ZSBtZXRob2QuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWVzcGFjZSAgICAgICAgICAgICAgVGhlIG5hbWVzcGFjZSBvZiB0aGUgbmF0aXZlIG1ldGhvZCB0byBjYWxsLlxuICogQHBhcmFtICB7b2JqZWN0fSBuYXRpdmVNZXRob2REZWZpbml0aW9uIE1ldGhvZCBkZWZpbml0aW9uIGZvciBuYXRpdmUgZnVuY3Rpb25cbiAqIEBwYXJhbSAge2FueX0gcGF5bG9hZCAgICAgICAgICAgICAgICAgICBOYXRpdmUgbWV0aG9kIHBheWxvYWRcbiAqIEBwYXJhbSAge3N0cmluZ30gY2FsbGJhY2tLZXkgICAgICAgICAgICBKUyBDYWxsYmFjayBmdW5jdGlvbiBuYW1lLlxuICovXG5Qcml2YXRlSGVscGVycy5wcm90b3R5cGUuZXhlY05hdGl2ZUNhbGwgPSBmdW5jdGlvbihuYXRpdmVNZXRob2REZWZpbml0aW9uLCBwYXlsb2FkLCBjYWxsYmFja0tleSkge1xuXG5cblx0aWYgKHRoaXMuY29yZS5oZWxwZXJzLmlzaU9TKCkpIHtcblxuICAgICAgaWYgKHR5cGVvZih3aW5kb3cpID09ICd1bmRlZmluZWQnIHx8IHR5cGVvZih3aW5kb3cud2Via2l0KSA9PSAndW5kZWZpbmVkJyB8fCB0eXBlb2Yod2luZG93LndlYmtpdC5tZXNzYWdlSGFuZGxlcnMpID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICBjb25zb2xlLmVycm9yKHRoaXMuY29yZS5jb25maWcubmFtZSArIFwiLWlvcyBkb2VzIG5vdCBleGlzdCFcIik7XG4gICAgICAgICByZXR1cm47XG5cdFx0fVxuXG4gICAgICBpZihwYXlsb2FkID09PSBudWxsIHx8IHBheWxvYWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgcGF5bG9hZCA9IFwiXCI7XG4gICAgICB9XG5cblx0XHR3aW5kb3cud2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5QZWFrQ29yZS5wb3N0TWVzc2FnZSh7XG4gICAgICAgICBtZXRob2REZWZpbml0aW9uOiBuYXRpdmVNZXRob2REZWZpbml0aW9uLFxuXHRcdFx0cGF5bG9hZDogcGF5bG9hZCxcblx0XHRcdGNhbGxiYWNrS2V5OiBjYWxsYmFja0tleVxuXHRcdH0pO1xuXG5cdH0gZWxzZSBpZiAodGhpcy5jb3JlLmhlbHBlcnMuaXNBbmRyb2lkKCkpIHtcblxuXHRcdGlmICh0eXBlb2YoUGVha0NvcmUpID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICBcdGNvbnNvbGUuZXJyb3IodGhpcy5jb3JlLmNvbmZpZy5uYW1lICsgXCItYW5kcm9pZCBkb2VzIG5vdCBleGlzdCFcIik7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHRyeXtcbiAgICAgICAgIGlmKHBheWxvYWQgPT09IG51bGwgfHwgcGF5bG9hZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwYXlsb2FkID0gXCJudWxsXCI7XG4gICAgICAgICB9XG4gICAgICAgICBpZihjYWxsYmFja0tleSA9PT0gbnVsbCB8fCBjYWxsYmFja0tleSA9PT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgIGNhbGxiYWNrS2V5ID0gXCJudWxsXCJcbiAgICAgICAgIH1cblx0XHRcdC8vSW52b2tlIG5hdGl2ZSBmdW5jdGlvbiBuYW1lXG4gICAgICAgICAvL0NvbnZlcnQgT2JqZWN0cyB0byBTdHJpbmdcblx0XHRcdGlmKHR5cGVvZihwYXlsb2FkKSA9PSAnb2JqZWN0Jyl7XG5cdFx0XHRcdHBheWxvYWQgPSBKU09OLnN0cmluZ2lmeShwYXlsb2FkKTtcblx0XHRcdH1cblx0XHRcdFBlYWtDb3JlWydpbnZva2VOYXRpdmVNZXRob2QnXShKU09OLnN0cmluZ2lmeShuYXRpdmVNZXRob2REZWZpbml0aW9uKSwgcGF5bG9hZCwgY2FsbGJhY2tLZXkpO1xuXHRcdH1jYXRjaChlKXtcblx0XHRcdGNvbnNvbGUuZXJyb3IobmF0aXZlTWV0aG9kRGVmaW5pdGlvbi5uYW1lc3BhY2UgKyBcIi9cIiArIG5hdGl2ZU1ldGhvZERlZmluaXRpb24ubmFtZSArIFwiKCkuIEFuZHJvaWQgSW50ZXJmYWNlIG1ldGhvZCBub3QgZGVmaW5lZC5cIilcblx0XHR9XG5cdH1cbn07XG5cbi8qKlxuICogR2VuZXJhdGVzIGEgcmFuZG9tIGZ1bmN0aW9uIG5hbWVcbiAqIEByZXR1cm4ge3N0cmluZ30gUmFuZG9tIGZ1bmN0aW9uIG5hbWVcbiAqL1xuUHJpdmF0ZUhlbHBlcnMucHJvdG90eXBlLmdlbmVyYXRlSWQgPSBmdW5jdGlvbigpIHtcbiAgIHZhciBjaWQgPSBcIl9fcGVha0NhbGxiYWNrXCI7XG4gICB2YXIgY2hhcnMgPSBcIkFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXpcIjtcbiAgIGZvciggdmFyIGk9MDsgaSA8IDg7IGkrKyApIHtcbiAgICAgIGNpZCArPSBjaGFycy5jaGFyQXQoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY2hhcnMubGVuZ3RoKSk7XG4gICB9XG4gICByZXR1cm4gY2lkO1xufTtcblxuXG4vKipcbiAqIENvbnZlcnRzIGFueSBzdHJpbmcgaW50byBjYW1lbENhc2UuXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyIFN0cmluZyB0byBjb252ZXJ0IHRvIGNhbWVsQ2FzZS5cbiAqIEByZXR1cm4ge3N0cmluZ30gQ29udmVydGVkIFN0cmluZ1xuICovXG5Qcml2YXRlSGVscGVycy5wcm90b3R5cGUudG9DYW1lbENhc2UgPSBmdW5jdGlvbihzdHIpIHtcbiAgICByZXR1cm4gc3RyLnJlcGxhY2UoL14oW0EtWl0pfFtcXHMtX10oXFx3KS9nLCBmdW5jdGlvbihtYXRjaCwgcDEsIHAyLCBvZmZzZXQpIHtcbiAgICAgICAgaWYgKHAyKSByZXR1cm4gcDIudG9VcHBlckNhc2UoKTtcbiAgICAgICAgcmV0dXJuIHAxLnRvTG93ZXJDYXNlKCk7XG4gICAgfSk7XG59O1xuXG5cbi8qKlxuICogTWVyZ2VzIHR3byBKUyBvYmplY3RzLlxuICogQHBhcmFtICB7T2JqZWN0fSBvYmoxIEZpcnN0IG9iamVjdFxuICogQHBhcmFtICB7T2JqZWN0fSBvYmoyIFNlY29uZCBvYmplY3RcbiAqIEByZXR1cm4ge09iamVjdH0gICAgICBSZXN1bHQgb2JqZWN0XG4gKi9cblByaXZhdGVIZWxwZXJzLnByb3RvdHlwZS5tZXJnZU9iamVjdCA9IGZ1bmN0aW9uIChvYmoxLCBvYmoyKSB7XG4gIGZvciAodmFyIHAgaW4gb2JqMikge1xuICAgIHRyeSB7XG4gICAgICAvLyBQcm9wZXJ0eSBpbiBkZXN0aW5hdGlvbiBvYmplY3Qgc2V0OyB1cGRhdGUgaXRzIHZhbHVlLlxuICAgICAgaWYgKCBvYmoyW3BdLmNvbnN0cnVjdG9yPT1PYmplY3QgKSB7XG4gICAgICAgIG9iajFbcF0gPSBNZXJnZVJlY3Vyc2l2ZShvYmoxW3BdLCBvYmoyW3BdKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9iajFbcF0gPSBvYmoyW3BdO1xuXG4gICAgICB9XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICAvLyBQcm9wZXJ0eSBpbiBkZXN0aW5hdGlvbiBvYmplY3Qgbm90IHNldDsgY3JlYXRlIGl0IGFuZCBzZXQgaXRzIHZhbHVlLlxuICAgICAgb2JqMVtwXSA9IG9iajJbcF07XG5cbiAgICB9XG4gIH1cbiAgcmV0dXJuIG9iajE7XG59XG5cblByaXZhdGVIZWxwZXJzLnByb3RvdHlwZS5hZGRTdWJjb21wb25lbnRUb0luaXRpYWxpemUgPSBmdW5jdGlvbigpIHtcbiAgIHRoaXMubnVtT2ZDb21wb25lbnRzVG9Jbml0aWFsaXplICs9IDE7XG59XG5cblByaXZhdGVIZWxwZXJzLnByb3RvdHlwZS5zdWJjb21wb25lbnREaWRJbml0aWFsaXplID0gZnVuY3Rpb24oKSB7XG4gICB0aGlzLmNvcmUuaW5mbyhcIlN1YmNvbXBvbmVudCBkaWQgaW5pdGlhbGl6ZSFcIilcbiAgIHRoaXMuc3ViY29tcG9uZW50c0RpZEluaXRpYWxpemUgKz0gMTtcbiAgIGlmICh0aGlzLnN1YmNvbXBvbmVudHNEaWRJbml0aWFsaXplID09IHRoaXMubnVtT2ZDb21wb25lbnRzVG9Jbml0aWFsaXplKSB7XG4gICAgICBpZiAodGhpcy5pbml0aWFsaXplZENhbGxiYWNrKVxuICAgICAgICAgdGhpcy5pbml0aWFsaXplZENhbGxiYWNrKHRoaXMuY29yZSk7XG4gICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBQcml2YXRlSGVscGVycztcbiIsIlxuXG52YXIgU2hhcmVkID0gZnVuY3Rpb24gU2hhcmVkKHBlYWspIHtcblxuICAgaWYgKHBlYWsgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc29sZS5lcnJvcihcInNoYXJlZC5qcyAtIE5vIFBlYWtDb3JlIGluc3RhbmNlIGdpdmVuIVwiKTtcbiAgIH1cblxuICAgdGhpcy5wZWFrID0gcGVhaztcbiAgIHRoaXMuZGF0YSA9IHt9O1xuXG5cbn1cblxuU2hhcmVkLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24oKSB7XG4gICAvLyBUZWxsIHBlYWsgdGhhdCBpdCBoYXMgdG8gd2FpdCB1bnRpbCBzaGFyZWQgaGFzIGxvYWRlZCBjb21wbGV0ZWx5LlxuICAgdGhpcy5wZWFrLmFkZFN1YmNvbXBvbmVudFRvSW5pdGlhbGl6ZSgpXG5cbiAgIGxldCB0aGF0ID0gdGhpcztcbiAgIHRoaXMucGVhay5tb2R1bGVzWydwZWFrQ29yZSddLnNldFNoYXJlZFZhbHVlID0gZnVuY3Rpb24ocGF5bG9hZCkge1xuICAgICAgdGhhdC5kYXRhW3BheWxvYWQua2V5XSA9IHBheWxvYWQudmFsdWVcbiAgIH1cblxuICAgaWYgKHRoaXMucGVhay5oZWxwZXJzLmlzaU9TKCkgfHwgdGhpcy5wZWFrLmhlbHBlcnMuaXNBbmRyb2lkKCkpIHtcbiAgICAgIHRoaXMucGVhay5jYWxsTmF0aXZlKCdwZWFrQ29yZScsICdnZXRTaGFyZWRTdG9yZScsIGZ1bmN0aW9uKHN0b3JlKSB7XG4gICAgICAgICB0aGF0LmRhdGEgPSBzdG9yZVxuICAgICAgICAgdGhhdC5wZWFrLnN1YmNvbXBvbmVudERpZEluaXRpYWxpemUoKVxuICAgICAgfSlcbiAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnBlYWsuaW5mbyhcIlN0b3JlIG5vdCBhdmFpbGFibGUgc2luY2Ugd2UgYXJlIG5vdCBvbiBpT1Mgb3IgQW5kcm9pZC5cIilcbiAgICAgIHRoYXQucGVhay5zdWJjb21wb25lbnREaWRJbml0aWFsaXplKClcbiAgIH1cblxuXG4gICB0aGlzLnBlYWsubW9kdWxlc1sncGVha0NvcmUnXS5zZXRTaGFyZWRWYWx1ZSA9IGZ1bmN0aW9uKHBheWxvYWQpIHtcbiAgICAgIHRoYXQuZGF0YVtwYXlsb2FkLmtleV0gPSBwYXlsb2FkLnZhbHVlXG4gICB9XG5cbn1cblxuU2hhcmVkLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihrZXkpIHtcbiAgIGxldCB0ZXN0ID0gdGhpcy5kYXRhW2tleV07XG4gICByZXR1cm4gdGVzdDtcbn1cblxuU2hhcmVkLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICB0aGlzLmRhdGFba2V5XSA9IHZhbHVlO1xuICAgdGhpcy5wZWFrLmNhbGxOYXRpdmUoJ3BlYWtDb3JlJywgJ3NldFNoYXJlZFZhbHVlJywge1xuICAgICAgICdrZXknOiBrZXksXG4gICAgICAgJ3ZhbHVlJyA6IHZhbHVlXG4gICAgfSk7XG59XG5cblNoYXJlZC5wcm90b3R5cGUuc2V0UGVyc2lzdGVudCA9IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgIHRoaXMuZGF0YVtrZXldID0gdmFsdWU7XG4gICB0aGlzLnBlYWsuY2FsbE5hdGl2ZSgncGVha0NvcmUnLCAnc2V0U2hhcmVkUGVyc2lzdGVudFZhbHVlJywge1xuICAgICAgICdrZXknOiBrZXksXG4gICAgICAgJ3ZhbHVlJyA6IHZhbHVlLFxuICAgICAgICdzZWN1cmUnIDogZmFsc2VcbiAgICB9KTtcbn1cblxuU2hhcmVkLnByb3RvdHlwZS5zZXRQZXJzaXN0ZW50U2VjdXJlID0gZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgdGhpcy5kYXRhW2tleV0gPSB2YWx1ZTtcbiAgIHRoaXMucGVhay5jYWxsTmF0aXZlKCdwZWFrQ29yZScsICdzZXRTaGFyZWRQZXJzaXN0ZW50VmFsdWUnLCB7XG4gICAgICAgJ2tleSc6IGtleSxcbiAgICAgICAndmFsdWUnIDogdmFsdWUsXG4gICAgICAgJ3NlY3VyZScgOiB0cnVlXG4gICAgfSk7XG59XG5tb2R1bGUuZXhwb3J0cyA9IFNoYXJlZFxuIiwibW9kdWxlLmV4cG9ydHM9e1xuICBcIm5hbWVcIjogXCJAYml0bWVjaGFuaWNzL3BlYWstY29yZVwiLFxuICBcInZlcnNpb25cIjogXCIxLjAuMTVcIixcbiAgXCJkZXNjcmlwdGlvblwiOiBcIlBFQUsgQ29yZSBpcyB0aGUgY29yZSBtb2R1bGUgdGhhdCBoYW5kbGVzIG5hdGl2ZSA8PiBqcyBjb21tdW5pY2F0aW9ucyBhbmQgYSBsb2dnaW5nIHByb3h5LlwiLFxuICBcIm1haW5cIjogXCJpbmRleC5qc1wiLFxuICBcInJlcG9zaXRvcnlcIjoge1xuICAgIFwidHlwZVwiOiBcImdpdFwiLFxuICAgIFwidXJsXCI6IFwiZ2l0K2h0dHBzOi8vcm9iaW4tYml0bWVjaGFuaWNzQGJpdGJ1Y2tldC5vcmcvYml0bWVjaGFuaWNzZ21iaC9wZWFrLWNvcmUuZ2l0XCJcbiAgfSxcbiAgXCJhdXRob3JcIjogXCJSb2JpbiBSZWl0ZXIgJiBNYXR0aGlhcyBIZXJtYW5uXCIsXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImpzb24tbG9hZGVyXCI6IFwiXjAuNS40XCJcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIG5pY2VGdW5jdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIGNvbnNvbGUubG9nKFwiSSBhbSBhIG5pY2UgZnVuY3Rpb24hXCIpXG4gIH1cbn07XG4iLCJcbmNvbnN0IE15TGlicmFyeSA9IHJlcXVpcmUoJy4uL19zaGFyZWRfbW9kdWxlcy9teS1saWJyYXJ5Jyk7XG5cblxuLy8gaW5pdGlhbGl6ZSBwZWFrXG4vLyBjb25zdCBQZWFrQ29yZSA9IHJlcXVpcmUoJ0BiaXRtZWNoYW5pY3MvcGVhay1jb3JlJyk7XG5jb25zdCBQZWFrQ29yZSA9IHJlcXVpcmUoJy4uLy4uLy4uL3BlYWstY29yZS9saWIvcGVhay1jb3JlJyk7XG5jb25zdCBwZWFrID0gbmV3IFBlYWtDb3JlKCk7XG5wZWFrLm1ha2VHbG9iYWwoJ3BlYWsnKTtcblxuLy8gTG9hZCB0aGUgdXNlcmxhbmQgbW9kdWxlIGFuZCB0aGUgbWV0aG9kcyB0aGF0IHlvdSBuZWVkIGZvciB0aGlzIGNvbXBvbmVudC5cbmNvbnN0IG1ldGhvZERlZmluaXRpb25zID0gcmVxdWlyZSgnLi9tZXRob2QtZGVmaW5pdGlvbnMnKTtcbnBlYWsudXNlTW9kdWxlKHJlcXVpcmUoJ0BiaXRtZWNoYW5pY3MvcGVhay11c2VybGFuZCcpLCBtZXRob2REZWZpbml0aW9ucyk7XG5cblxucGVhay5pbml0aWFsaXplKChwZWFrSW5zdGFuY2UpID0+IHtcbiAgIGNvbnNvbGUubG9nKFwiUGVhayBJbml0aWFsaXplZCEhISFcIilcbiAgIGxldCBwZWFrID0gcGVha0luc3RhbmNlO1xuICAgbGV0IHVzZXJsYW5kID0gcGVhay5tb2R1bGVzLnBlYWtVc2VybGFuZDtcblxuICAgbGV0IHRoYXQgPSBwZWFrO1xuXG4gICAvLyBCaW5kIGEgSlMgbWV0aG9kIHNvIHRoZSBuYXRpdmUgc2lkZSBjYW4gY2FsbCBpdFxuICAgdXNlcmxhbmQuYmluZCgnc29ydCcsIGZ1bmN0aW9uKGFycmF5SWZOdW1iZXJzKSB7XG4gICAgICByZXR1cm4gXy5zb3J0QnkoYXJyYXlJZk51bWJlcnMsIGZ1bmN0aW9uKG51bSlcbiAgICAgIHtcbiAgICAgICAgIHJldHVybiBNYXRoLnNpbihudW0pXG4gICAgICB9KTtcbiAgIH0pO1xuXG4gICB1c2VybGFuZC5iaW5kKCdkZWJ1Z01vZGVUZXN0JywgZnVuY3Rpb24oKSB7XG4gICAgICBpZiAocGVhay5jb25maWcuZGVidWcpIHtcbiAgICAgICAgIHBlYWsuaW5mbyhcIkRlYnVnIG1vZGUgaXMgZW5hYmxlZFwiKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgIHBlYWsuaW5mbyhcIkRlYnVnIG1vZGUgaXMgZGlzYWJsZWRcIilcbiAgICAgIH1cbiAgIH0pXG5cblxuICAgLy8gTG9hZCBKUyBjb2RlIGZyb20gX3NoYXJlZF9tb2R1bGVzXG4gICBNeUxpYnJhcnkubmljZUZ1bmN0aW9uKCk7XG5cbiAgIC8vIHBlYWsuc2V0KCdrZXknLCAndmFsdWUnKVxuICAgLy8gcGVhay5nZXQoJ2tleScsICh2YWx1ZSkgPT4ge1xuICAgLy8gICAgcGVhay5pbmZvKFwiSVlGIFwiICsgdmFsdWUpXG4gICAvLyB9KVxuICAgLy9cblxuICAgLy8gcGVhay5pbmZvKFwiVG9wIFNlY3JldCBcIiArIHBlYWsuZ2V0KCdzZWN1cmUtdG9rZW4nKSlcbiAgIC8vIHBlYWsuc2V0UGVyc2lzdGVudCgnc29tZS1wZXJzaXN0ZW50LXZhbHVlJywgJ0hpIScpXG4gICAvLyBwZWFrLnNldFBlcnNpc3RlbnRTZWN1cmUoJ3NlY3VyZS10b2tlbicsICdJIGFtIHZlcnkgc2VjdXJlIScpXG5cbiAgIC8vIEFsd2F5cyB0cmlnZ2VyIG9uUmVhZHkoKSBvbmNlIHlvdXIgY29kZSBpcyByZWFkeS5cbiAgIC8vVGhpcyB0ZWxscyB0aGUgcGVhayBlY29zeXN0ZW0gKGVzcGVjaWFsbHkgdGhlIHBlYWsgbmF0aXZlIHNpZGUpIHRoYXQgeW91IGFyZSByZWFkeSFcblxuXG4gICAvLyBzZXRUaW1lb3V0KCgpID0+IHtcbiAgIC8vICAgIGNvbnNvbGUubG9nKFwiR2V0IE15S2V5IFwiICsgcGVhay5nZXQoXCJNeUtleVwiKSlcbiAgIC8vICAgIHBlYWsuaW5mbyhwZWFrLmdldChcIk15S2V5XCIpKVxuICAgLy8gfSwgMjAwMClcblxuICAgLy8gRXhlY3V0ZSBhIG5hdGl2ZSBtZXRob2RcbiAgIC8vIHBlYWtVc2VybGFuZC5kaXNwbGF5VGltZShEYXRlLm5vdygpKVxuXG4gICAvLyBUZWxsIHBlYWstY29yZS1uYXRpdmUgdGhhdCBvdXIgdXNlcmxhbmQgc2lkZSBpcyBhcmUgcmVhZHkhXG4gICBwZWFrLm9uUmVhZHkoKTtcblxufSlcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgbmF0aXZlOiBbXG5cbiAgIF0sXG4gICBqczogW1xuICAgICAge1xuICAgICAgICAgbmFtZTogJ3NvcnQnLFxuICAgICAgICAgcGF5bG9hZDoge1xuICAgICAgICAgICAgZGF0YVR5cGU6ICdhcnJheSdcbiAgICAgICAgIH0sXG4gICAgICAgICBjYWxsYmFjazoge1xuICAgICAgICAgICAgZGF0YVR5cGU6ICdhcnJheSdcbiAgICAgICAgIH1cbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgICBuYW1lOiAnZGlzcGxheVRpbWUnLFxuICAgICAgICAgcGF5bG9hZDoge1xuICAgICAgICAgICAgZGF0YVR5cGU6ICdzdHJpbmcnXG4gICAgICAgICB9XG4gICAgICB9LFxuICAgICAge1xuICAgICAgICAgbmFtZTogJ2RlYnVnTW9kZVRlc3QnXG4gICAgICB9XG4gICBdXG59XG4iLCJ2YXIgY29uZmlnID0ge1xuICAgIFwic2tpcEpTTWV0aG9kVmFsaWRhdGlvbk9uSW5zdGFsbFwiIDogdHJ1ZSxcbiAgICBcImdlbmVyYXRlRnVuY3Rpb25TdHVic1wiOiB0cnVlLFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbmZpZzsiLCJtb2R1bGUuZXhwb3J0cz17XG4gIFwiX2FyZ3NcIjogW1xuICAgIFtcbiAgICAgIFwiQGJpdG1lY2hhbmljcy9wZWFrLXVzZXJsYW5kQF4xLjAuMVwiLFxuICAgICAgXCIvVXNlcnMvcm9iaW4vRG9jdW1lbnRzL0Zpcm1hL0xhdWZlbmRlIFByb2pla3RlL2ZhbGtlbWVkaWEgR21iSC9Ib21lQ29ubmVjdC9KU1BvcnQvZm0tc2ltcGx5eXVtbXktcGVha1wiXG4gICAgXVxuICBdLFxuICBcIl9mcm9tXCI6IFwiQGJpdG1lY2hhbmljcy9wZWFrLXVzZXJsYW5kQD49MS4wLjEgPDIuMC4wXCIsXG4gIFwiX2lkXCI6IFwiQGJpdG1lY2hhbmljcy9wZWFrLXVzZXJsYW5kQDEuMC4xXCIsXG4gIFwiX2luQ2FjaGVcIjogdHJ1ZSxcbiAgXCJfaW5zdGFsbGFibGVcIjogdHJ1ZSxcbiAgXCJfbG9jYXRpb25cIjogXCIvQGJpdG1lY2hhbmljcy9wZWFrLXVzZXJsYW5kXCIsXG4gIFwiX25vZGVWZXJzaW9uXCI6IFwiNi4yLjBcIixcbiAgXCJfbnBtT3BlcmF0aW9uYWxJbnRlcm5hbFwiOiB7XG4gICAgXCJob3N0XCI6IFwicGFja2FnZXMtMTYtZWFzdC5pbnRlcm5hbC5ucG1qcy5jb21cIixcbiAgICBcInRtcFwiOiBcInRtcC9wZWFrLXVzZXJsYW5kLTEuMC4xLnRnel8xNDY1OTI3Nzc4Nzk2XzAuNDExMDEzOTM0NTI4NDU1MTRcIlxuICB9LFxuICBcIl9ucG1Vc2VyXCI6IHtcbiAgICBcImVtYWlsXCI6IFwicm9iaW5AYml0bWVjaGFuaWNzLmRlXCIsXG4gICAgXCJuYW1lXCI6IFwicm9iaW43MzMxXCJcbiAgfSxcbiAgXCJfbnBtVmVyc2lvblwiOiBcIjMuNy41XCIsXG4gIFwiX3BoYW50b21DaGlsZHJlblwiOiB7fSxcbiAgXCJfcmVxdWVzdGVkXCI6IHtcbiAgICBcIm5hbWVcIjogXCJAYml0bWVjaGFuaWNzL3BlYWstdXNlcmxhbmRcIixcbiAgICBcInJhd1wiOiBcIkBiaXRtZWNoYW5pY3MvcGVhay11c2VybGFuZEBeMS4wLjFcIixcbiAgICBcInJhd1NwZWNcIjogXCJeMS4wLjFcIixcbiAgICBcInNjb3BlXCI6IFwiQGJpdG1lY2hhbmljc1wiLFxuICAgIFwic3BlY1wiOiBcIj49MS4wLjEgPDIuMC4wXCIsXG4gICAgXCJ0eXBlXCI6IFwicmFuZ2VcIlxuICB9LFxuICBcIl9yZXF1aXJlZEJ5XCI6IFtcbiAgICBcIi9cIlxuICBdLFxuICBcIl9zaGFzdW1cIjogXCI1YjA4YTQ2ZGQ4MGM4MWJmMDY2MThjZWRhNzRiMTU3YjUwOGUwNTkwXCIsXG4gIFwiX3Nocmlua3dyYXBcIjogbnVsbCxcbiAgXCJfc3BlY1wiOiBcIkBiaXRtZWNoYW5pY3MvcGVhay11c2VybGFuZEBeMS4wLjFcIixcbiAgXCJfd2hlcmVcIjogXCIvVXNlcnMvcm9iaW4vRG9jdW1lbnRzL0Zpcm1hL0xhdWZlbmRlIFByb2pla3RlL2ZhbGtlbWVkaWEgR21iSC9Ib21lQ29ubmVjdC9KU1BvcnQvZm0tc2ltcGx5eXVtbXktcGVha1wiLFxuICBcImF1dGhvclwiOiB7XG4gICAgXCJuYW1lXCI6IFwiUm9iaW4gUmVpdGVyICYgTWF0dGhpYXMgSGVybWFublwiXG4gIH0sXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHt9LFxuICBcImRlc2NyaXB0aW9uXCI6IFwiIyMgSW5zdGFsbGF0aW9uICMjXCIsXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHt9LFxuICBcImRpcmVjdG9yaWVzXCI6IHt9LFxuICBcImRpc3RcIjoge1xuICAgIFwic2hhc3VtXCI6IFwiNWIwOGE0NmRkODBjODFiZjA2NjE4Y2VkYTc0YjE1N2I1MDhlMDU5MFwiLFxuICAgIFwidGFyYmFsbFwiOiBcImh0dHBzOi8vcmVnaXN0cnkubnBtanMub3JnL0BiaXRtZWNoYW5pY3MvcGVhay11c2VybGFuZC8tL3BlYWstdXNlcmxhbmQtMS4wLjEudGd6XCJcbiAgfSxcbiAgXCJtYWluXCI6IFwicGVhay11c2VybGFuZC5qc1wiLFxuICBcIm1haW50YWluZXJzXCI6IFtcbiAgICB7XG4gICAgICBcImVtYWlsXCI6IFwicm9iaW5AYml0bWVjaGFuaWNzLmRlXCIsXG4gICAgICBcIm5hbWVcIjogXCJyb2JpbjczMzFcIlxuICAgIH0sXG4gICAge1xuICAgICAgXCJlbWFpbFwiOiBcInVib290ZmVuc3RlckBnb29nbGVtYWlsLmNvbVwiLFxuICAgICAgXCJuYW1lXCI6IFwidHdpdHRhZHJvY2tcIlxuICAgIH1cbiAgXSxcbiAgXCJuYW1lXCI6IFwiQGJpdG1lY2hhbmljcy9wZWFrLXVzZXJsYW5kXCIsXG4gIFwib3B0aW9uYWxEZXBlbmRlbmNpZXNcIjoge30sXG4gIFwicmVhZG1lXCI6IFwiRVJST1I6IE5vIFJFQURNRSBkYXRhIGZvdW5kIVwiLFxuICBcInNjcmlwdHNcIjoge1xuICAgIFwidGVzdFwiOiBcImVjaG8gXFxcIkVycm9yOiBubyB0ZXN0IHNwZWNpZmllZFxcXCIgJiYgZXhpdCAxXCJcbiAgfSxcbiAgXCJ2ZXJzaW9uXCI6IFwiMS4wLjFcIlxufVxuIiwidmFyIFBlYWtNb2R1bGUgPSBmdW5jdGlvbiAocGVhaywgY3VzdG9tRGF0YSkge1xuICAgdGhpcy5wYWNrYWdlSlNPTiA9IHJlcXVpcmUoJy4vcGFja2FnZS5qc29uJyk7XG4gICB0aGlzLmNvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnJyk7XG4gICB0aGlzLnBlYWsgPSBwZWFrO1xuICAgdGhpcy5uYXRpdmVNZXRob2RzID0gY3VzdG9tRGF0YS5uYXRpdmU7XG4gICB0aGlzLkpTTWV0aG9kcyA9IGN1c3RvbURhdGEuanM7XG59XG5cblxuLyoqXG4gKiBCaW5kcyBhIGN1c3RvbSBKUyBmdW5jdGlvbiB0byB0aGUgUGVha0NvcmUgc3lzdGVtLlxuICogQHBhcmFtICB7c3RyaW5nfSBmdW5jdGlvbk5hbWUgVGhlIG5hbWUgb2YgdGhlIGZ1bmN0aW9uLlxuICogQHBhcmFtICB7b2JqZWN0fSBmdW5jICAgICAgICAgVGhlIGZ1bmN0aW9uIGl0c2VsZi5cbiAqL1xuUGVha01vZHVsZS5wcm90b3R5cGUuYmluZCA9IGZ1bmN0aW9uKGZ1bmN0aW9uTmFtZSwgZnVuYyl7XG5cblx0dmFyIEpTTWV0aG9kRGVmaW5pdGlvbiA9IHRoaXMucGVhay5nZXRKU01ldGhvZERlZmluaXRpb24oXCJwZWFrVXNlcmxhbmRcIixmdW5jdGlvbk5hbWUpO1xuXG5cdGlmKEpTTWV0aG9kRGVmaW5pdGlvbiA9PT0gdW5kZWZpbmVkKXtcblx0XHR0aGlzLl9lcnJvcihmdW5jdGlvbk5hbWUgK1wiKCkgaXMgbm90IGRlY2xhcmVkIGluIG1ldGhvZCBkZWZpbml0aW9ucyFcIilcblx0XHRyZXR1cm47XG5cdH1cblxuXHQvL1JlZ2lzdGVyIGEgY2FsbGFibGUgSlMgRnVuY3Rpb24gdGhhdCBzaW1wbHkgYnJvYWRjYXN0cyBhbiBldmVudCB0aGF0IGhhcyB0aGUgc2FtZSBuYW1lIGFzIHRoZSBmdW5jdGlvblxuXHR0aGlzW2Z1bmN0aW9uTmFtZV0gPSBmdW5jO1xuXHRpZih0aGlzLnBlYWsuY29uZmlnLmRlYnVnKXtcblx0XHR0aGlzLl9pbmZvKGZ1bmN0aW9uTmFtZSArIFwiKCkgaGFzIGJlZW4gYmluZGVkIHRvIFwiICsgdGhpcy5uYW1lKTtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQZWFrTW9kdWxlO1xuIl19
