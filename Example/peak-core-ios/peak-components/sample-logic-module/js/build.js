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
            data: {
               store: 'object'
            }
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
  		return !helpers.isAndroid();
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
	privateHelpers = new PrivateHelpers(this, {});

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

/**
* Makes this PeakCore instance available in the window.
*/
Core.prototype.makeGlobal = function(varName) {
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


module.exports = PrivateHelpers;

},{}],8:[function(require,module,exports){


var Shared = function Shared(peak) {

   if (peak === undefined) {
      console.error("shared.js - No PeakCore instance given!");
   }

   this.peak = peak;
   this.data = {};

   let that = this;
   this.peak.modules['peakCore'].setSharedValue = function(payload) {
      that.data[payload.key] = payload.value
   }

   this.peak.callNative('peakCore', 'getSharedStore', function(store) {
      this.data = store;
   })

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
  "version": "1.0.14",
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


// initialize peak
// const PeakCore = require('@bitmechanics/peak-core');
const PeakCore = require('../../../peak-core/lib/peak-core');
const peak = new PeakCore();
peak.config.debug = false;
peak.makeGlobal('peak');

// Load the userland module and the methods that you need for this component.
const methodDefinitions = require('./method-definitions');
const peakUserland = peak.useModule(require('@bitmechanics/peak-userland'), methodDefinitions);

// Load whatever library you like through npm
const _ = require('underscore');

// Load JS code from _shared_modules
const MyLibrary = require('../_shared_modules/my-library');
MyLibrary.niceFunction();

// Bind a JS method so the native side can call it
peakUserland.bind('sort', function(arrayIfNumbers) {
   return _.sortBy(arrayIfNumbers, function(num)
   {
      return Math.sin(num)
   });
});



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
peak.onReady();

// setTimeout(() => {
//    console.log("Get MyKey " + peak.get("MyKey"))
//    peak.info(peak.get("MyKey"))
// }, 2000)

// Execute a native method
// peakUserland.displayTime(Date.now())

},{"../../../peak-core/lib/peak-core":6,"../_shared_modules/my-library":10,"./method-definitions":12,"@bitmechanics/peak-userland":15,"underscore":16}],12:[function(require,module,exports){
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

},{"./config":13,"./package.json":14}],16:[function(require,module,exports){
//     Underscore.js 1.7.0
//     http://underscorejs.org
//     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.7.0';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var createCallback = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // A mostly-internal function to generate callbacks that can be applied
  // to each element in a collection, returning the desired result — either
  // identity, an arbitrary callback, a property matcher, or a property accessor.
  _.iteratee = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return createCallback(value, context, argCount);
    if (_.isObject(value)) return _.matches(value);
    return _.property(value);
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    if (obj == null) return obj;
    iteratee = createCallback(iteratee, context);
    var i, length = obj.length;
    if (length === +length) {
      for (i = 0; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    if (obj == null) return [];
    iteratee = _.iteratee(iteratee, context);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length),
        currentKey;
    for (var index = 0; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = function(obj, iteratee, memo, context) {
    if (obj == null) obj = [];
    iteratee = createCallback(iteratee, context, 4);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        index = 0, currentKey;
    if (arguments.length < 3) {
      if (!length) throw new TypeError(reduceError);
      memo = obj[keys ? keys[index++] : index++];
    }
    for (; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      memo = iteratee(memo, obj[currentKey], currentKey, obj);
    }
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = function(obj, iteratee, memo, context) {
    if (obj == null) obj = [];
    iteratee = createCallback(iteratee, context, 4);
    var keys = obj.length !== + obj.length && _.keys(obj),
        index = (keys || obj).length,
        currentKey;
    if (arguments.length < 3) {
      if (!index) throw new TypeError(reduceError);
      memo = obj[keys ? keys[--index] : --index];
    }
    while (index--) {
      currentKey = keys ? keys[index] : index;
      memo = iteratee(memo, obj[currentKey], currentKey, obj);
    }
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var result;
    predicate = _.iteratee(predicate, context);
    _.some(obj, function(value, index, list) {
      if (predicate(value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    if (obj == null) return results;
    predicate = _.iteratee(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(_.iteratee(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    if (obj == null) return true;
    predicate = _.iteratee(predicate, context);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        index, currentKey;
    for (index = 0; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function(obj, predicate, context) {
    if (obj == null) return false;
    predicate = _.iteratee(predicate, context);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        index, currentKey;
    for (index = 0; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (obj.length !== +obj.length) obj = _.values(obj);
    return _.indexOf(obj, target) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matches(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matches(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = obj.length === +obj.length ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = _.iteratee(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = obj.length === +obj.length ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = _.iteratee(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var set = obj && obj.length === +obj.length ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (obj.length !== +obj.length) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function(obj, iteratee, context) {
    iteratee = _.iteratee(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = _.iteratee(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = _.iteratee(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = low + high >>> 1;
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return obj.length === +obj.length ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(obj, predicate, context) {
    predicate = _.iteratee(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    if (n < 0) return [];
    return slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return slice.call(array, Math.max(array.length - n, 0));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    for (var i = 0, length = input.length; i < length; i++) {
      var value = input[i];
      if (!_.isArray(value) && !_.isArguments(value)) {
        if (!strict) output.push(value);
      } else if (shallow) {
        push.apply(output, value);
      } else {
        flatten(value, shallow, strict, output);
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (array == null) return [];
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = _.iteratee(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = array.length; i < length; i++) {
      var value = array[i];
      if (isSorted) {
        if (!i || seen !== value) result.push(value);
        seen = value;
      } else if (iteratee) {
        var computed = iteratee(value, i, array);
        if (_.indexOf(seen, computed) < 0) {
          seen.push(computed);
          result.push(value);
        }
      } else if (_.indexOf(result, value) < 0) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(flatten(arguments, true, true, []));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    if (array == null) return [];
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = array.length; i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(slice.call(arguments, 1), true, true, []);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function(array) {
    if (array == null) return [];
    var length = _.max(arguments, 'length').length;
    var results = Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = isSorted < 0 ? Math.max(0, length + isSorted) : isSorted;
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var idx = array.length;
    if (typeof from == 'number') {
      idx = from < 0 ? idx + from + 1 : Math.min(idx, from + 1);
    }
    while (--idx >= 0) if (array[idx] === item) return idx;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var Ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    args = slice.call(arguments, 2);
    bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      Ctor.prototype = func.prototype;
      var self = new Ctor;
      Ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (_.isObject(result)) return result;
      return self;
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    return function() {
      var position = 0;
      var args = boundArgs.slice();
      for (var i = 0, length = args.length; i < length; i++) {
        if (args[i] === _) args[i] = arguments[position++];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return func.apply(this, args);
    };
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = hasher ? hasher.apply(this, arguments) : key;
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last > 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed before being called N times.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      } else {
        func = null;
      }
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    if (!_.isObject(obj)) return obj;
    var source, prop;
    for (var i = 1, length = arguments.length; i < length; i++) {
      source = arguments[i];
      for (prop in source) {
        if (hasOwnProperty.call(source, prop)) {
            obj[prop] = source[prop];
        }
      }
    }
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj, iteratee, context) {
    var result = {}, key;
    if (obj == null) return result;
    if (_.isFunction(iteratee)) {
      iteratee = createCallback(iteratee, context);
      for (key in obj) {
        var value = obj[key];
        if (iteratee(value, key, obj)) result[key] = value;
      }
    } else {
      var keys = concat.apply([], slice.call(arguments, 1));
      obj = new Object(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];
        if (key in obj) result[key] = obj[key];
      }
    }
    return result;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(concat.apply([], slice.call(arguments, 1)), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    if (!_.isObject(obj)) return obj;
    for (var i = 1, length = arguments.length; i < length; i++) {
      var source = arguments[i];
      for (var prop in source) {
        if (obj[prop] === void 0) obj[prop] = source[prop];
      }
    }
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (
      aCtor !== bCtor &&
      // Handle Object.create(x) cases
      'constructor' in a && 'constructor' in b &&
      !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
        _.isFunction(bCtor) && bCtor instanceof bCtor)
    ) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size, result;
    // Recursively compare objects and arrays.
    if (className === '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size === b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      size = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      result = _.keys(b).length === size;
      if (result) {
        while (size--) {
          // Deep compare each member
          key = keys[size];
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj) || _.isArguments(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around an IE 11 bug.
  if (typeof /./ !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function(value) {
    return value;
  };

  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = function(key) {
    return function(obj) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of `key:value` pairs.
  _.matches = function(attrs) {
    var pairs = _.pairs(attrs), length = pairs.length;
    return function(obj) {
      if (obj == null) return !length;
      obj = new Object(obj);
      for (var i = 0; i < length; i++) {
        var pair = pairs[i], key = pair[0];
        if (pair[1] !== obj[key] || !(key in obj)) return false;
      }
      return true;
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = createCallback(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? object[property]() : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offest.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));

},{}]},{},[11])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9wZWFrLWNvcmUvY29uZmlnL2NvbmZpZy5qcyIsIi4uL3BlYWstY29yZS9jb25maWcvcmVxdWlyZWQtanMtbWV0aG9kcy5qcyIsIi4uL3BlYWstY29yZS9jb25maWcvcmVxdWlyZWQtbmF0aXZlLW1ldGhvZHMuanMiLCIuLi9wZWFrLWNvcmUvbGliL2hlbHBlcnMuanMiLCIuLi9wZWFrLWNvcmUvbGliL2xvZ2dlci5qcyIsIi4uL3BlYWstY29yZS9saWIvcGVhay1jb3JlLmpzIiwiLi4vcGVhay1jb3JlL2xpYi9wcml2YXRlLWhlbHBlcnMuanMiLCIuLi9wZWFrLWNvcmUvbGliL3NoYXJlZC5qcyIsIi4uL3BlYWstY29yZS9wYWNrYWdlLmpzb24iLCJjbGllbnRfc3JjL19zaGFyZWRfbW9kdWxlcy9teS1saWJyYXJ5LmpzIiwiY2xpZW50X3NyYy9sb2dpY19zYW1wbGUtbG9naWMtbW9kdWxlL2FwcC5qcyIsImNsaWVudF9zcmMvbG9naWNfc2FtcGxlLWxvZ2ljLW1vZHVsZS9tZXRob2QtZGVmaW5pdGlvbnMuanMiLCJub2RlX21vZHVsZXMvQGJpdG1lY2hhbmljcy9wZWFrLXVzZXJsYW5kL2NvbmZpZy5qcyIsIm5vZGVfbW9kdWxlcy9AYml0bWVjaGFuaWNzL3BlYWstdXNlcmxhbmQvcGFja2FnZS5qc29uIiwibm9kZV9tb2R1bGVzL0BiaXRtZWNoYW5pY3MvcGVhay11c2VybGFuZC9wZWFrLXVzZXJsYW5kLmpzIiwibm9kZV9tb2R1bGVzL3VuZGVyc2NvcmUvdW5kZXJzY29yZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RhQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgcGpzb24gPSByZXF1aXJlKCcuLi9wYWNrYWdlLmpzb24nKTtcblxudmFyIGNvbmZpZyA9IHt9O1xuXG4vKipcbiAqIERlZmluZXMgdGhlIFBlYWsgQ29yZSBOYW1lXG4gKi9cbmNvbmZpZy5uYW1lID0gXCJwZWFrLWNvcmVcIjtcblxuLyoqXG4gKiBEZWZpbmVzIGlmIHRoZSBkZWJ1Z2dpbmcgbW9kZSBpcyB0dXJuZWQgb25cbiAqIEB0eXBlIHtCb29sZWFufVxuICovXG5jb25maWcuZGVidWcgPSB0cnVlO1xuXG4vKipcbiAqIFVzZWQgYXMgcHJlZml4IGZvciBjb25zb2xlIG91dHB1dHMuXG4gKiBAcGFyYW0ge1N0cmluZ31cbiAqL1xuY29uZmlnLmNvbnNvbGVUYWcgPSBjb25maWcubmFtZSArIFwiIChcIiArIHBqc29uLnZlcnNpb24gKyBcIilcIjtcblxuLyoqXG4gKiBNZXRob2QgZGVmaW5pdGlvbnMgZm9yIG5hdGl2ZSBtZXRob2RzLlxuICogQHBhcmFtICB7YXJyYXl9IEFuIGFycmF5IG9mIG1ldGhvZCBkZWZpbml0aW9ucy5cbiAqL1xuY29uZmlnLm5hdGl2ZU1ldGhvZHMgPSByZXF1aXJlKCcuL3JlcXVpcmVkLW5hdGl2ZS1tZXRob2RzJyk7XG5cbi8qKlxuICogTWV0aG9kIGRlZmluaXRpb25zIGZvciBKUyBtZXRob2RzLlxuICogQHBhcmFtICB7YXJyYXl9IEFuIGFycmF5IG9mIG1ldGhvZCBkZWZpbml0aW9ucy5cbiAqL1xuY29uZmlnLkpTTWV0aG9kcyA9IHJlcXVpcmUoJy4vcmVxdWlyZWQtanMtbWV0aG9kcycpO1xuXG4vKipcbiAqIERlZmF1bHQgY29uZmlndXJhdGlvbiBmb3IgbW9kdWxlcyB0aGF0IGRvIG5vdCBoYXZlIGFuIG93biA8PE1vZHVsZT4+LmNvbmZpZyBvYmplY3RcbiAqL1xuY29uZmlnLmRlZmF1bHRNb2R1bGVDb25maWcgPSB7XG4gICAgc2tpcEpTTWV0aG9kVmFsaWRhdGlvbk9uSW5zdGFsbCA6IGZhbHNlLFxuICAgIGdlbmVyYXRlRnVuY3Rpb25TdHVicyA6IGZhbHNlXG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBjb25maWc7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0J3BlYWtDb3JlJyA6IFtcblx0XHR7XG5cdFx0XHRuYW1lOiAnZW5hYmxlRGVidWcnLFxuXHRcdFx0cGF5bG9hZDoge1xuXHRcdFx0XHRkYXRhVHlwZTogJ2Jvb2xlYW4nXG5cdFx0XHR9LFxuXHRcdFx0bmFtZXNwYWNlOiAncGVha0NvcmUnXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRuYW1lOiAnc2V0U2hhcmVkVmFsdWUnLFxuXHRcdFx0cGF5bG9hZDoge1xuXHRcdFx0XHRkYXRhVHlwZTogJ29iamVjdCcsXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRrZXkgOiAnc3RyaW5nJyxcblx0XHRcdFx0XHR2YWx1ZSA6ICdzdHJpbmcnXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRuYW1lc3BhY2U6ICdwZWFrQ29yZSdcblx0XHR9XG5cdF1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgJ3BlYWtDb3JlJyA6IFtcbiAgICAgIHtcbiAgICAgIFx0bmFtZTogJ2xvZycsXG4gICAgICAgICBwYXlsb2FkOiB7XG4gICAgICAgICAgICBkYXRhVHlwZTogJ3N0cmluZydcbiAgICAgICAgIH0sXG4gICAgICAgICBuYW1lc3BhY2U6ICdwZWFrQ29yZSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICBcdG5hbWU6ICdsb2dFcnJvcicsXG4gICAgICAgICBwYXlsb2FkOiB7XG4gICAgICAgICAgICBkYXRhVHlwZTogJ3N0cmluZydcbiAgICAgICAgIH0sXG4gICAgICAgICBuYW1lc3BhY2U6ICdwZWFrQ29yZSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICBcdG5hbWU6ICdvblJlYWR5JyxcbiAgICAgICAgIG5hbWVzcGFjZTogJ3BlYWtDb3JlJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgIG5hbWU6ICdzZXRTaGFyZWRWYWx1ZScsXG4gICAgICAgICBwYXlsb2FkOiB7XG4gICAgICAgICAgICBkYXRhVHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICBrZXk6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgdmFsdWU6ICdzdHJpbmcnXG4gICAgICAgICAgICB9XG4gICAgICAgICB9LFxuICAgICAgICAgbmFtZXNwYWNlOiAncGVha0NvcmUnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICAgbmFtZTogJ3NldFNoYXJlZFBlcnNpc3RlbnRWYWx1ZScsXG4gICAgICAgICBwYXlsb2FkOiB7XG4gICAgICAgICAgICBkYXRhVHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICBrZXk6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgdmFsdWU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgc2VjdXJlOiAnYm9vbGVhbidcbiAgICAgICAgICAgIH1cbiAgICAgICAgIH0sXG4gICAgICAgICBuYW1lc3BhY2U6ICdwZWFrQ29yZSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgICBuYW1lOiAnZ2V0U2hhcmVkU3RvcmUnLFxuICAgICAgICAgY2FsbGJhY2s6IHtcbiAgICAgICAgICAgIGRhdGFUeXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgIHN0b3JlOiAnb2JqZWN0J1xuICAgICAgICAgICAgfVxuICAgICAgICAgfSxcbiAgICAgICAgIG5hbWVzcGFjZTogJ3BlYWtDb3JlJ1xuICAgICAgfVxuICAgXVxufTtcbiIsIlxudmFyIGhlbHBlcnMgPSB7fTtcblxuLyoqXG4gKiBDaGVja3Mgd2V0aGVyIHRoZSBjdXJyZW50IHVzZXIgYWdlbnQgaXMgcnVubmluZyBBbmRyb2lkXG4gKiBAcmV0dXJuIHtib29sZWFufSBUcnVlIGlmIHVzZXIgYWdlbnQgaXMgYW5kcm9pZFxuICovXG5oZWxwZXJzLmlzQW5kcm9pZCA9IGZ1bmN0aW9uKCl7XG5cdCAgIGlmICgodHlwZW9mIG5hdmlnYXRvciA9PSAndW5kZWZpbmVkJykpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0dmFyIHVhID0gbmF2aWdhdG9yLnVzZXJBZ2VudC50b0xvd2VyQ2FzZSgpO1xuICBcdFx0cmV0dXJuIHVhLmluZGV4T2YoXCJhbmRyb2lkXCIpID4gLTE7XG59O1xuXG4vKipcbiAqIENoZWNrcyB3ZXRoZXIgdGhlIGN1cnJlbnQgdXNlciBhZ2VudCBpcyBydW5uaW5nIGlPU1xuICogQHJldHVybiB7Ym9vbGVhbn0gVHJ1ZSBpZiB1c2VyIGFnZW50IGlzIGlPU1xuICovXG5oZWxwZXJzLmlzaU9TID0gZnVuY3Rpb24oKXtcbiAgXHRcdHJldHVybiAhaGVscGVycy5pc0FuZHJvaWQoKTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBoZWxwZXJzO1xuIiwiXG4vKipcbiAqIExvZ2dlciBjbGFzcyBhY3RzIGFzIHByb3h5IHRvIGRlbGl2ZXIgY29uc29sZS5sb2dzIHRvIHRoZSBuYXRpdmUgc2lkZS4gKFRoZXkgdGhhbiBzaG93IHVwIGluIHRoZSBuYXRpdmUgY29uc29sZSBpbnN0ZWFkIG9mIGp1c3QgaW4gdGhlIEpTIGNvbnNvbGUpXG4gKiBAcGFyYW0gIHtQZWFrQ29yZX0gY29yZSBBbiBpbnN0YW5jZSBvZiB0aGUgUGVha0NvcmUgY2xhc3MgdG8gaGFuZGxlIG5hdGl2ZSBjb21tdW5pY2F0aW9ucy5cbiAqIEByZXR1cm4ge0xvZ2dlcn0gICAgICBMb2dnZXIgaW5zdGFuY2VcbiAqL1xudmFyIGxvZ2dlciA9IGZ1bmN0aW9uIExvZ2dlcihwZWFrLHByaXZhdGVIZWxwZXJzKSB7XG4gICBpZiAocGVhayA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFwibG9nZ2VyLmpzIC0gTm8gUGVha0NvcmUgaW5zdGFuY2UgZ2l2ZW4hXCIpO1xuICAgfVxuICAgdGhpcy5wZWFrID0gcGVhaztcbiAgIHRoaXMucHJpdmF0ZUhlbHBlcnMgPSBwcml2YXRlSGVscGVycztcbiAgIHRoaXMuY29uZmlnID0gcGVhay5jb25maWc7XG4gICBcbiAgIHRoaXMuaW5mb01ldGhvZERlZmluaXRpb24gPSB0aGlzLnBlYWsuZ2V0TmF0aXZlTWV0aG9kRGVmaW5pdGlvbigncGVha0NvcmUnLCAnbG9nJyk7XG4gICB0aGlzLmVycm9yTWV0aG9kRGVmaW5pdGlvbiA9IHRoaXMucGVhay5nZXROYXRpdmVNZXRob2REZWZpbml0aW9uKCdwZWFrQ29yZScsICdsb2dFcnJvcicpO1xuXG59XG5cbi8qKlxuICogTG9nIGEgZGVidWcgbWVzc2FnZSB0byB0aGUgSlMgY29uc29sZSBhbmQgdmlhIFBlYWtDb3JlIHRvIHRoZSBuYXRpdmUgY29uc29sZS5cbiAqIEBwYXJhbSAge3N0cmluZ30gbWVzc2FnZSBUaGUgbWVzc2FnZSB0aGF0IHNob3VsZCBiZSBsb2dnZWQuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGN1c3RvbVRhZyBUaGUgbG9nIG1lc3NhZ2Ugd2lsbCBpbmNsdWRlIHRoaXMgY3VzdG9tIHRhZyBpZiBwcm92aWRlZC5cbiAqL1xubG9nZ2VyLnByb3RvdHlwZS5pbmZvID0gZnVuY3Rpb24obWVzc2FnZSwgY3VzdG9tVGFnKSB7XG5cbiAgIGlmIChjdXN0b21UYWcgPT09IHVuZGVmaW5lZClcbiAgICAgIGN1c3RvbVRhZyA9IHRoaXMuY29uZmlnLmNvbnNvbGVUYWc7XG4gICBlbHNlXG4gICAgICBjdXN0b21UYWcgPSB0aGlzLmNvbmZpZy5jb25zb2xlVGFnICsgXCIgW1wiICsgY3VzdG9tVGFnICsgXCJdXCI7XG5cbiAgIHZhciBsb2dNc2cgPSBjdXN0b21UYWcgKyBcIjogXCIgKyBtZXNzYWdlO1xuICAgXG4gICB0aGlzLnByaXZhdGVIZWxwZXJzLmV4ZWNOYXRpdmVDYWxsKHRoaXMuaW5mb01ldGhvZERlZmluaXRpb24sIGxvZ01zZyk7XG4gICBjb25zb2xlLmxvZyhsb2dNc2cpO1xufVxuXG4vKipcbiAqIExvZyBhbiBlcnJvciBtZXNzYWdlIHRvIHRoZSBKUyBjb25zb2xlIGFuZCB2aWEgUGVha0NvcmUgdG8gdGhlIG5hdGl2ZSBjb25zb2xlLlxuICogQHBhcmFtICB7c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRoYXQgc2hvdWxkIGJlIGxvZ2dlZC5cbiAqIEBwYXJhbSAge3N0cmluZ30gY3VzdG9tVGFnIFRoZSBsb2cgbWVzc2FnZSB3aWxsIGluY2x1ZGUgdGhpcyBjdXN0b20gdGFnIGlmIHByb3ZpZGVkLlxuICovXG5sb2dnZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24obWVzc2FnZSwgY3VzdG9tVGFnKSB7XG5cbiAgIGlmIChjdXN0b21UYWcgPT09IHVuZGVmaW5lZClcbiAgICAgIGN1c3RvbVRhZyA9IHRoaXMuY29uZmlnLmNvbnNvbGVUYWc7XG4gICBlbHNlXG4gICAgICBjdXN0b21UYWcgPSB0aGlzLmNvbmZpZy5jb25zb2xlVGFnICsgXCIgW1wiICsgY3VzdG9tVGFnICsgXCJdXCI7XG5cbiAgIHZhciBsb2dNc2cgPSBjdXN0b21UYWcgKyBcIjogXCIgKyBtZXNzYWdlO1xuXG4gICB0aGlzLnByaXZhdGVIZWxwZXJzLmV4ZWNOYXRpdmVDYWxsKHRoaXMuZXJyb3JNZXRob2REZWZpbml0aW9uLCBsb2dNc2cpO1xuICAgY29uc29sZS5lcnJvcihsb2dNc2cpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGxvZ2dlcjtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgQ29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnL2NvbmZpZycpO1xudmFyIEhlbHBlcnMgPSByZXF1aXJlKCcuL2hlbHBlcnMnKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcicpO1xudmFyIFByaXZhdGVIZWxwZXJzID0gcmVxdWlyZSgnLi9wcml2YXRlLWhlbHBlcnMnKTtcbnZhciBTaGFyZWQgPSByZXF1aXJlKCcuL3NoYXJlZCcpO1xuXG5cbi8vIHByaXZhdGUgdmFyc1xudmFyIG5hdGl2ZUNhbGxiYWNrRnVuY3Rpb25zID0ge307XG52YXIgcHJpdmF0ZUhlbHBlcnM7XG5cbi8qKlxuKiBUaGUgUGVha0NvcmUgY2xhc3MgaXMgdXNlZCB0byBjb21tdW5pY2F0ZSBiZXR3ZWVuIGEgSlMgY29udGV4dCBhbmQgYSBuYXRpdmUgaU9TIG9yIEFuZHJvaWQgYXBwLlxuKiBAcmV0dXJuIHtQZWFrQ29yZX0gICAgICBQZWFrQ29yZSBpbnN0YW5jZVxuKi9cbnZhciBDb3JlID0gZnVuY3Rpb24gUGVha0NvcmUoKSB7XG5cblx0Ly8gaW5pdGlhbGl6ZSB0aGUgcHJpdmF0ZSBoZWxwZXJzXG5cdHByaXZhdGVIZWxwZXJzID0gbmV3IFByaXZhdGVIZWxwZXJzKHRoaXMsIHt9KTtcblxuXHQvLyBpbml0aWFsaXplIHRoZSBwcm9wZXJ0eSB0aGF0IGhvbGRzIGluc3RhbGxlZCBwZWFrIG1vZHVsZXMuXG5cdHRoaXMubW9kdWxlcyA9IHt9O1xuXHR0aGlzLm1vZHVsZXNbXCJwZWFrQ29yZVwiXSA9IHt9XG5cblx0LyoqXG5cdCogVGhlIGNvbmZpZ3VyYXRpb24gb2JqZWN0XG5cdCogQHR5cGUge29iamVjdH1cblx0Ki9cblx0dGhpcy5jb25maWcgPSBDb25maWc7XG5cblx0LyoqXG5cdCogSGVscGVycyBvYmplY3Rcblx0KiBAdHlwZSB7b2JqZWN0fVxuXHQqL1xuXHR0aGlzLmhlbHBlcnMgPSBIZWxwZXJzO1xuXG5cdC8qKlxuXHQqIEEgTG9nZ2VyIGluc3RhbmNlIGZvciBsb2dnaW5nIG1lc3NhZ2VzIHRvIHRoZSBuYXRpdmUgY29uc29sZVxuXHQqIEB0eXBlIHtMb2dnZXJ9XG5cdCovXG5cdHRoaXMubG9nZ2VyID0gbmV3IExvZ2dlcih0aGlzLHByaXZhdGVIZWxwZXJzKTtcblxuXHQvKipcblx0KiBDb252ZW5pZW50IG1ldGhvZCB0byBsb2cgYW4gaW5mbyBtZXNzYWdlLlxuXHQqIEB0eXBlIHtGdW5jdGlvbn1cblx0Ki9cblx0dGhpcy5pbmZvID0gdGhpcy5sb2dnZXIuaW5mby5iaW5kKHRoaXMubG9nZ2VyKTtcblxuXHQvKipcblx0KiBDb252ZW5pZW50IG1ldGhvZCB0byBsb2cgYW4gZXJyb3IgbWVzc2FnZS5cblx0KiBAdHlwZSB7RnVuY3Rpb259XG5cdCovXG5cdHRoaXMuZXJyb3IgPSB0aGlzLmxvZ2dlci5lcnJvci5iaW5kKHRoaXMubG9nZ2VyKTtcblxuXHQvKipcblx0KiBBIFNoYXJlZCBkYXRhc3RvcmUuXG5cdCogQHR5cGUge1NoYXJlZH1cblx0Ki9cblx0dGhpcy5zaGFyZWQgPSBuZXcgU2hhcmVkKHRoaXMpO1xuXG5cdC8qKlxuXHQqIENvbnZlbmllbnQgbWV0aG9kIHRvIHNldCBhIHZhbHVlIGludG8gdGhlIHNoYXJlZCBkYXRhc3RvcmUuXG5cdCogQHR5cGUge1t0eXBlXX1cblx0Ki9cblx0dGhpcy5zZXQgPSB0aGlzLnNoYXJlZC5zZXQuYmluZCh0aGlzLnNoYXJlZCk7XG5cblxuXHQvKipcblx0KiBDb252ZW5pZW50IG1ldGhvZCB0byBnZXQgYSB2YWx1ZSBpbnRvIHRoZSBzaGFyZWQgZGF0YXN0b3JlLlxuXHQqIEB0eXBlIHtbdHlwZV19XG5cdCovXG5cdHRoaXMuZ2V0ID0gdGhpcy5zaGFyZWQuZ2V0LmJpbmQodGhpcy5zaGFyZWQpO1xuXG5cblx0LyoqXG5cdCogQ29udmVuaWVudCBtZXRob2QgdG8gc2V0IGEgdmFsdWUgaW50byB0aGUgc2hhcmVkIGRhdGFzdG9yZS4gVGhpcyB2YWx1ZSB3aWxsIGJlIHdyaXR0ZW4gdG8gdGhlIGRpc2suXG5cdCogQHR5cGUge1t0eXBlXX1cblx0Ki9cblx0dGhpcy5zZXRQZXJzaXN0ZW50ID0gdGhpcy5zaGFyZWQuc2V0UGVyc2lzdGVudC5iaW5kKHRoaXMuc2hhcmVkKTtcblxuXG5cdC8qKlxuXHQqIENvbnZlbmllbnQgbWV0aG9kIHRvIHNldCBhIHZhbHVlIGludG8gdGhlIHNoYXJlZCBkYXRhc3RvcmUuIFRoaXMgdmFsdWUgd2lsbCBiZSB3cml0dGVuIGFuZCBlbmNyeXB0ZWQgdG8gdGhlIGRpc2suXG5cdCogQHR5cGUge1t0eXBlXX1cblx0Ki9cblx0dGhpcy5zZXRQZXJzaXN0ZW50U2VjdXJlID0gdGhpcy5zaGFyZWQuc2V0UGVyc2lzdGVudFNlY3VyZS5iaW5kKHRoaXMuc2hhcmVkKTtcblxuXG5cblx0LyoqXG5cdCogVGVsbCB0aGUgbmF0aXZlIHNpZGUgdGhhdCBhbiBhcmJpdHJpYXJ5IG1vZHVsZSBpcyBsb2FkZWQuIChVc3VhbGx5IHVzZWQgb24gbmF0aXZlIHNpZGUgdG8gZGlzcGxheSB0aGUgV2ViVmlldylcblx0KiBNdXN0IGJlIGNhbGxlZCBleHBsaWNpdGx5IGZyb20geW91ciBQZWFrIEFwcCBieSBjYWxsaW5nIHBlYWsub25SZWFkeSgpXG5cdCovXG5cdHRoaXMub25SZWFkeSA9IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuY2FsbE5hdGl2ZSgncGVha0NvcmUnLCAnb25SZWFkeScpO1xuXHR9XG5cblx0dmFyIHRoYXQgPSB0aGlzO1xuXHQvLyBpbml0aWFsaXplIHRoZSBKYXZhU2NyaXB0IE1ldGhvZHMgb2YgUGVhayBDb3JlIE1vZHVsZVxuXHR0aGlzLm1vZHVsZXNbXCJwZWFrQ29yZVwiXS5lbmFibGVEZWJ1ZyA9IGZ1bmN0aW9uKHN0YXRlKSB7XG5cdFx0dGhhdC5jb25maWcuZGVidWcgPSBzdGF0ZTtcblx0fVxuXG59XG5cbi8qKlxuKiBNYWtlcyB0aGlzIFBlYWtDb3JlIGluc3RhbmNlIGF2YWlsYWJsZSBpbiB0aGUgd2luZG93LlxuKi9cbkNvcmUucHJvdG90eXBlLm1ha2VHbG9iYWwgPSBmdW5jdGlvbih2YXJOYW1lKSB7XG5cdHdpbmRvd1t2YXJOYW1lXSA9IHRoaXM7XG59XG5cbi8qKlxuKiBSZWdpc3RlcmVzIGEgUGVha01vZHVsZSB3aXRoIHRoaXMgUGVha0NvcmUgaW5zdGFuY2UuXG4qIEBwYXJhbSAge09iamVjdH0gTW9kdWxlQ2xhc3MgVGhlIG1vZHVsZSBjbGFzcyB0byBiZSBpbnN0YW50aWF0ZWQgYW5kIHJlZ2lzdGVyZWRcbiogQHJldHVybiB7T2JqZWN0fSAgICAgICAgICAgICBBbiBpbnN0YW5jZSBvZiB0aGUgZ2l2ZW4gbW9kdWxlLlxuKi9cbkNvcmUucHJvdG90eXBlLnVzZU1vZHVsZSA9IGZ1bmN0aW9uKE1vZHVsZUNsYXNzLCBjdXN0b21EYXRhKSB7XG5cblx0aWYgKE1vZHVsZUNsYXNzID09PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLmVycm9yKFwiQ2Fubm90IGluc3RhbGwgdW5kZWZpbmVkIFBlYWtNb2R1bGVcIik7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dmFyIG1vZHVsZSA9IG5ldyBNb2R1bGVDbGFzcyh0aGlzLCBjdXN0b21EYXRhKTtcblxuXG5cdGlmIChtb2R1bGUucGFja2FnZUpTT04gPT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuZXJyb3IoXCJNb2R1bGUgaGFzIG5vIHBhY2thZ2VKU09OIHByb3BlcnR5IGRlZmluZWQhXCIpO1xuXHRcdHJldHVybjtcblx0fVxuXHR2YXIgcGFja2FnZUpTT04gPSBtb2R1bGUucGFja2FnZUpTT047XG5cblx0aWYgKHR5cGVvZihtb2R1bGUuY29uZmlnKSA9PSAndW5kZWZpbmVkJykge1xuXHRcdG1vZHVsZS5jb25maWcgPSB0aGlzLmNvbmZpZy5kZWZhdWx0TW9kdWxlQ29uZmlnO1xuXHR9ZWxzZXtcblx0XHRmb3IodmFyIGtleSBpbiB0aGlzLmNvbmZpZy5kZWZhdWx0TW9kdWxlQ29uZmlnKXtcblx0XHRcdGlmKChrZXkgaW4gbW9kdWxlLmNvbmZpZykgPT0gZmFsc2Upe1xuXHRcdFx0XHRtb2R1bGUuY29uZmlnW2tleV0gPSB0aGlzLmNvbmZpZy5kZWZhdWx0TW9kdWxlQ29uZmlnW2tleV07XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0dmFyIHBhY2thZ2VKU09OID0gbW9kdWxlLnBhY2thZ2VKU09OO1xuXG5cdC8vIGdldCB0aGUgcGxhaW4gbW9kdWxlIG5hbWUgd2l0aG91dCBcIkBiaXRtZWNoYW5pY3MvXCIuXG5cdHZhciBtb2R1bGVOYW1lID0gcGFja2FnZUpTT04ubmFtZS5yZXBsYWNlKFwiQGJpdG1lY2hhbmljcy9cIiwgXCJcIik7XG5cblx0Ly9jb252ZXJ0IGNhbWUgdG8gY2FtZWxDYXNlLlxuXHR2YXIgbW9kdWxlTmFtZUNhbWVsQ2FzZSA9IHByaXZhdGVIZWxwZXJzLnRvQ2FtZWxDYXNlKG1vZHVsZU5hbWUpO1xuXG5cdC8vIGV4dHJhIHZhciBmb3IgYSBtb3JlIHJlYWRhYmxlIGNvZGUuIFRoZSBtb2R1bGUgbmFtZXNwYWNlIGlzIHRoZSBjYW1lbENhc2UgdmVyc2lvbiBvZiB0aGUgbW9kdWxlIG5hbWUuXG5cdHZhciBtb2R1bGVOYW1lU3BhY2UgPSBtb2R1bGVOYW1lQ2FtZWxDYXNlO1xuXG5cdGlmIChtb2R1bGVOYW1lQ2FtZWxDYXNlIGluIHRoaXMubW9kdWxlcykge1xuXHRcdHRoaXMuaW5mbyhcIk1vZHVsZSBcIiArIG1vZHVsZU5hbWUgKyBcIiB3YXMgaW5zdGFsbGVkIGFscmVhZHkhXCIpO1xuXHRcdHJldHVybiB0aGlzLm1vZHVsZXNbbW9kdWxlTmFtZVNwYWNlXTtcblx0fVxuXG5cdGlmIChtb2R1bGUubmF0aXZlTWV0aG9kcyA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5lcnJvcihcIk1vZHVsZSBcIiArIG1vZHVsZU5hbWUgKyBcIiBoYXMgbm8gbmF0aXZlTWV0aG9kcyBwcm9wZXJ0eSFcIik7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0aWYgKG1vZHVsZS5KU01ldGhvZHMgPT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuZXJyb3IoXCJNb2R1bGUgXCIgKyBtb2R1bGVOYW1lICsgXCIgaGFzIG5vIEpTTWV0aG9kcyBwcm9wZXJ0eSFcIik7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0bW9kdWxlLl9jYWxsTmF0aXZlID0gZnVuY3Rpb24oZnVuY3Rpb25OYW1lLCBwYXlsb2FkLCBjYWxsYmFjaykge1xuXHRcdHRoaXMucGVhay5jYWxsTmF0aXZlKG1vZHVsZU5hbWVTcGFjZSwgZnVuY3Rpb25OYW1lLCBwYXlsb2FkLCBjYWxsYmFjayk7XG5cdH07XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBtb2R1bGUubmF0aXZlTWV0aG9kcy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBkZWZpbml0aW9uID0gbW9kdWxlLm5hdGl2ZU1ldGhvZHNbaV07XG5cdFx0aWYgKHR5cGVvZihkZWZpbml0aW9uLm5hbWVzcGFjZSkgPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdGRlZmluaXRpb24ubmFtZXNwYWNlID0gbW9kdWxlTmFtZVNwYWNlO1xuXHRcdH1cblx0XHQvL2FkZCBmdW5jdGlvbiBzdHVicyB0byBtb2R1bGUgdG8gZWFzZSBjYWxsaW5nIG5hdGl2ZSBmdW5jdGlvbnMgd2l0aCBkb3Qtbm90YXRpb25cblx0XHRpZihtb2R1bGUuY29uZmlnLmdlbmVyYXRlRnVuY3Rpb25TdHVicyA9PSB0cnVlKXtcblx0XHRcdG1vZHVsZVtkZWZpbml0aW9uLm5hbWVdID0gZnVuY3Rpb24oZnVuY05hbWUpe1xuXHRcdFx0XHRyZXR1cm4gIGZ1bmN0aW9uKHBheWxvYWQsIGNhbGxiYWNrKXtcblx0XHRcdFx0XHRtb2R1bGUuX2NhbGxOYXRpdmUoZnVuY05hbWUscGF5bG9hZCxjYWxsYmFjayk7XG5cdFx0XHRcdH07XG5cdFx0XHR9KGRlZmluaXRpb24ubmFtZSk7XG5cdFx0fVxuXHR9XG5cdHZhciBuYXRpdmVNZXRob2RzT2JqID0ge307XG5cdG5hdGl2ZU1ldGhvZHNPYmpbbW9kdWxlTmFtZVNwYWNlXSA9IG1vZHVsZS5uYXRpdmVNZXRob2RzO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgbW9kdWxlLkpTTWV0aG9kcy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBkZWZpbml0aW9uID0gbW9kdWxlLkpTTWV0aG9kc1tpXTtcblx0XHRpZiAodHlwZW9mKGRlZmluaXRpb24ubmFtZXNwYWNlKSA9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0ZGVmaW5pdGlvbi5uYW1lc3BhY2UgPSBtb2R1bGVOYW1lU3BhY2U7XG5cdFx0fVxuXHRcdGlmIChtb2R1bGUuY29uZmlnLnNraXBKU01ldGhvZFZhbGlkYXRpb25Pbkluc3RhbGwgPT0gZmFsc2UpIHtcblx0XHRcdGlmICh0eXBlb2YobW9kdWxlW2RlZmluaXRpb24ubmFtZV0pID09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdHRoaXMuZXJyb3IoZGVmaW5pdGlvbi5uYW1lICsgXCIgaXMgbm90IGltcGxlbWVudGVkIGluIG1vZHVsZSBcIiArIG1vZHVsZU5hbWVTcGFjZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdHZhciBKU01ldGhvZHNPYmogPSB7fTtcblx0SlNNZXRob2RzT2JqW21vZHVsZU5hbWVTcGFjZV0gPSBtb2R1bGUuSlNNZXRob2RzO1xuXG5cblx0Ly8gYWRkIHRoZSBtb2R1bGUgbWV0aG9kIGRlZmluaXRpb25zIHRvIHRoZSBjb25maWcgb2JqZWN0XG5cdHRoaXMuY29uZmlnLm5hdGl2ZU1ldGhvZHMgPSBwcml2YXRlSGVscGVycy5tZXJnZU9iamVjdCh0aGlzLmNvbmZpZy5uYXRpdmVNZXRob2RzLCBuYXRpdmVNZXRob2RzT2JqKTtcblx0dGhpcy5jb25maWcuSlNNZXRob2RzID0gcHJpdmF0ZUhlbHBlcnMubWVyZ2VPYmplY3QodGhpcy5jb25maWcuSlNNZXRob2RzLCBKU01ldGhvZHNPYmopO1xuXG5cdGlmICh0aGlzLmNvbmZpZy5kZWJ1Zykge1xuXHRcdHRoaXMuaW5mbyhcIm5hdGl2ZU1ldGhvZHM6IFwiICsgSlNPTi5zdHJpbmdpZnkodGhpcy5jb25maWcubmF0aXZlTWV0aG9kcywgbnVsbCwgNCkpO1xuXHRcdHRoaXMuaW5mbyhcIkpTTWV0aG9kczogXCIgKyBKU09OLnN0cmluZ2lmeSh0aGlzLmNvbmZpZy5KU01ldGhvZHMsIG51bGwsIDQpKTtcblxuXHRcdHZhciBpbmZvTXNnID0gXCJNb2R1bGUgXCIgKyBtb2R1bGVOYW1lICsgXCIgd2l0aCB2ZXJzaW9uIFwiICsgcGFja2FnZUpTT04udmVyc2lvbiArIFwiIHdhcyBpbnN0YWxsZWRcXG5cIlxuXHRcdCsgJ3dpdGggY29uZmlndXJhdGlvbjogJyArIEpTT04uc3RyaW5naWZ5KG1vZHVsZS5jb25maWcsbnVsbCw0KTtcblxuXHRcdHRoaXMuaW5mbyhpbmZvTXNnKTtcblx0fVxuXG5cblx0bW9kdWxlLl9pbmZvID0gZnVuY3Rpb24obXNnKSB7XG5cdFx0dGhpcy5wZWFrLmluZm8obXNnLG1vZHVsZU5hbWUgKyBcIihcIiArIHBhY2thZ2VKU09OLnZlcnNpb24gKyBcIilcIik7XG5cdH07XG5cblx0bW9kdWxlLl9lcnJvciA9IGZ1bmN0aW9uKG1zZykge1xuXHRcdHRoaXMucGVhay5lcnJvcihtc2csbW9kdWxlTmFtZSArIFwiKFwiICsgcGFja2FnZUpTT04udmVyc2lvbiArIFwiKVwiKTtcblx0fTtcblxuXHRtb2R1bGUubmFtZSA9IG1vZHVsZU5hbWU7XG5cdG1vZHVsZS5uYW1lc3BhY2UgPSBtb2R1bGVOYW1lU3BhY2U7XG5cblx0dGhpcy5tb2R1bGVzW21vZHVsZU5hbWVTcGFjZV0gPSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZTtcbn1cblxuLyoqXG4qIGNhbGxKUyBpcyB1c2VkIGJ5IHRoZSBuYXRpdmUgc2lkZSB0byBjYWxsIGEgbWV0aG9kIGluIEpTLlxuKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWVzcGFjZSBcdCAgVGhlIG5hbWVzcGFjZSBvZiB0aGUgSlMgZnVuY3Rpb24gdG8gY2FsbC5cbiogQHBhcmFtICB7c3RyaW5nfSBmdW5jdGlvbk5hbWUgICBOYW1lIG9mIHRoZSBKUyBmdW5jdGlvbi5cbiogQHBhcmFtICB7YW55fSBwYXlsb2FkICAgICAgICAgICBQYXlsb2FkIHRvIGRlbGl2ZXIgdG8gdGhlIGZ1bmN0aW9uLlxuKiBAcGFyYW0gIHtzdHJpbmd9IG5hdGl2ZUNhbGxiYWNrIEZ1bmN0aW9uIG5hbWUgb2YgdGhlIG5hdGl2ZSBjYWxsYmFjay4gKE9ubHkgcmVxdWlyZWQgb24gQW5kcm9pZClcbiovXG5Db3JlLnByb3RvdHlwZS5jYWxsSlMgPSBmdW5jdGlvbihuYW1lc3BhY2UsIGZ1bmN0aW9uTmFtZSwgcGF5bG9hZCwgbmF0aXZlQ2FsbGJhY2spIHtcblxuXHRpZiAodGhpcy5jb25maWcuZGVidWcpIHtcblx0XHR0aGlzLmluZm8oXCJKUyBmdW5jdGlvbiBcIiArIG5hbWVzcGFjZSArIFwiL1wiICsgZnVuY3Rpb25OYW1lICsgXCIgY2FsbGVkLlwiKTtcblx0fVxuXG5cdGlmIChwcml2YXRlSGVscGVycy5pc01vZHVsZUluc3RhbGxlZChuYW1lc3BhY2UpID09IGZhbHNlKSB7XG5cdFx0dGhpcy5lcnJvcihcIk1vZHVsZSBcIiArIG5hbWVzcGFjZSArIFwiIGlzIG5vdCBpbnN0YWxsZWQuXCIpXG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0Ly9HZXQgSlMgbWV0aG9kIGRlZmluaXRpb25cblx0dmFyIEpTTWV0aG9kRGVmaW5pdGlvbiA9IHRoaXMuZ2V0SlNNZXRob2REZWZpbml0aW9uKG5hbWVzcGFjZSwgZnVuY3Rpb25OYW1lKTtcblxuXHQvLyBpcyBtZXRob2QgZGVmaW5lZCBpbiBjb25maWc/XG5cdGlmIChKU01ldGhvZERlZmluaXRpb24gPT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuZXJyb3IobmFtZXNwYWNlICsgXCIvXCIgKyBmdW5jdGlvbk5hbWUgKyBcIigpIGlzIG5vdCBpbXBsZW1lbnRlZCBpbiBKYXZhU2NyaXB0IENvZGUhXCIpO1xuXHRcdHJldHVybjtcblx0fVxuXG5cdC8vIGlzIHBheWxvYWQgdHlwZSBjb3JyZWN0PyAocGF5bG9hZCB0eXBlcyBmb3IgZnVuY3Rpb25zIGFyZSBkZWZpbmVkIGluIHRoZSBjb25maWcgb2JqZWN0KVxuXHRpZiAocHJpdmF0ZUhlbHBlcnMuaXNOYXRpdmVNZXRob2RQYXlsb2FkVmFsaWQoSlNNZXRob2REZWZpbml0aW9uLCBwYXlsb2FkKSA9PSBmYWxzZSkge1xuXHRcdHRoaXMuZXJyb3IobmFtZXNwYWNlICsgXCIvXCIgKyBmdW5jdGlvbk5hbWUgKyBcIigpIHBheWxvYWQgbm90IHZhbGlkIVwiKTtcblx0XHRyZXR1cm47XG5cdH1cblxuXHR2YXIgbW9kdWxlID0gdGhpcy5tb2R1bGVzW25hbWVzcGFjZV07XG5cblx0dmFyIGNhbGxiYWNrRGF0YSA9IG1vZHVsZVtmdW5jdGlvbk5hbWVdKHBheWxvYWQpO1xuXG5cdC8vIHNraXAgdGhlIHJlc3QgaWYgd2UgZG9udCBuZWVkIGEgY2FsbGJhY2tcblx0aWYgKHR5cGVvZihKU01ldGhvZERlZmluaXRpb24uY2FsbGJhY2spID09ICd1bmRlZmluZWQnKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0aWYgKHByaXZhdGVIZWxwZXJzLmlzQ2FsbGJhY2tEYXRhVmFsaWRGb3JNZXRob2REZWZpbml0aW9uKEpTTWV0aG9kRGVmaW5pdGlvbiwgY2FsbGJhY2tEYXRhKSA9PSBmYWxzZSkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGlmKGNhbGxiYWNrRGF0YSAhPT0gdW5kZWZpbmVkKXtcblx0XHRpZiAodGhpcy5oZWxwZXJzLmlzaU9TKCkpIHtcblx0XHRcdHJldHVybiBjYWxsYmFja0RhdGE7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmKHRoaXMuY29uZmlnLmRlYnVnKXtcblx0XHRcdFx0dGhpcy5pbmZvKFwiQW5kcm9pZCBOYXRpdmUgQ2FsbGJhY2sgXCIgKyBuYXRpdmVDYWxsYmFjayArXCIoKSBjYWxsZWQuIFdpdGggZGF0YTogXCIgKyBKU09OLnN0cmluZ2lmeShjYWxsYmFja0RhdGEsbnVsbCw0KSk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIGV4ZWN1dGUgdGhlIG5hdGl2ZSBjYWxsXG5cdFx0XHQvL1NldCB1bml2ZXJzYWwgY2FsbGJhY2sgbmFtZSBpbiBBbmRyb2lkXG5cdFx0XHRKU01ldGhvZERlZmluaXRpb24uY2FsbGJhY2submFtZSA9IFwiaW52b2tlTmF0aXZlQ2FsbGJhY2tcIjtcblx0XHRcdHByaXZhdGVIZWxwZXJzLmV4ZWNOYXRpdmVDYWxsKEpTTWV0aG9kRGVmaW5pdGlvbiwgY2FsbGJhY2tEYXRhLCBjYWxsYmFja0tleSk7XG5cdFx0fVxuXG5cdH1cblxufVxuXG4vKipcbiogVGhpcyBmdW5jdGlvbiBpcyB1c2VkIGJ5IHRoZSBuYXRpdmUgc2lkZSB0byBpbnZvY2UgYSBjYWxsYmFjayBmdW5jdGlvbi5cbiogQHBhcmFtICB7c3RyaW5nfSBjYWxsYmFja0Z1bmN0aW9uTmFtZSBUaGUgZnVuY3Rpb24gbmFtZSBvZiB0aGUgY2FsbGJhY2tcbiogQHBhcmFtICB7YW55fSBqc29uRGF0YSAgICAgUGF5bG9hZCBvZiB0aGUgY2FsbGJhY2suXG4qL1xuQ29yZS5wcm90b3R5cGUuY2FsbENhbGxiYWNrID0gZnVuY3Rpb24oY2FsbGJhY2tGdW5jdGlvbk5hbWUsIGpzb25EYXRhKSB7XG5cblx0aWYgKHRoaXMuY29uZmlnLmRlYnVnKSB7XG5cdFx0aWYodHlwZW9mKGpzb25EYXRhKSA9PSAnb2JqZWN0Jyl7XG5cdFx0XHR0aGlzLmluZm8oXCJKUyBjYWxsYmFjayAnXCIgKyBjYWxsYmFja0Z1bmN0aW9uTmFtZSArIFwiJycgY2FsbGVkLiBXaXRoIGRhdGE6IFwiICsgSlNPTi5zdHJpbmdpZnkoanNvbkRhdGEsbnVsbCw0KSk7XG5cdFx0fWVsc2V7XG5cdFx0XHR0aGlzLmluZm8oXCJKUyBjYWxsYmFjayAnXCIgKyBjYWxsYmFja0Z1bmN0aW9uTmFtZSArIFwiJyBjYWxsZWQuIFdpdGggZGF0YTogXCIgKyBqc29uRGF0YSk7XG5cdFx0fVxuXHR9XG5cblx0aWYgKGNhbGxiYWNrRnVuY3Rpb25OYW1lIGluIG5hdGl2ZUNhbGxiYWNrRnVuY3Rpb25zKSB7XG5cblx0XHR2YXIgY2FsbGJhY2tGdW5jdGlvbiA9IG5hdGl2ZUNhbGxiYWNrRnVuY3Rpb25zW2NhbGxiYWNrRnVuY3Rpb25OYW1lXS5jYWxsYmFja0Z1bmN0aW9uO1xuXHRcdHZhciBjYWxsZXJGdW5jdGlvbk5hbWUgPSBuYXRpdmVDYWxsYmFja0Z1bmN0aW9uc1tjYWxsYmFja0Z1bmN0aW9uTmFtZV0uY2FsbGVyRnVuY3Rpb25OYW1lO1xuXHRcdHZhciBjYWxsZXJOYW1lc3BhY2UgPSBuYXRpdmVDYWxsYmFja0Z1bmN0aW9uc1tjYWxsYmFja0Z1bmN0aW9uTmFtZV0uY2FsbGVyTmFtZXNwYWNlO1xuXG5cdFx0dmFyIG1ldGhvZCA9IHRoaXMuZ2V0TmF0aXZlTWV0aG9kRGVmaW5pdGlvbihjYWxsZXJOYW1lc3BhY2UsIGNhbGxlckZ1bmN0aW9uTmFtZSk7XG5cblx0XHRpZiAocHJpdmF0ZUhlbHBlcnMuaXNDYWxsYmFja0RhdGFWYWxpZEZvck1ldGhvZERlZmluaXRpb24obWV0aG9kLCBqc29uRGF0YSkgPT0gZmFsc2UpIHtcblx0XHRcdHRoaXMuZXJyb3IoY2FsbGVyRnVuY3Rpb25OYW1lICsgXCIoKSBjYWxsYmFjayBkYXRhIGRvZXMgbm90IG1hdGNoIGRlZmluaXRpb24hXCIpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNhbGxiYWNrRnVuY3Rpb24oanNvbkRhdGEpO1xuXG5cdFx0Ly9GcmVlIG1lbW9yeVxuXHRcdGRlbGV0ZSBuYXRpdmVDYWxsYmFja0Z1bmN0aW9uc1tjYWxsYmFja0Z1bmN0aW9uTmFtZV07XG5cblx0fSBlbHNlIHtcblx0XHR0aGlzLmVycm9yKGNhbGxiYWNrRnVuY3Rpb25OYW1lICsgXCIoKSBjYWxsYmFjayBub3QgZGVmaW5lZCFcIik7XG5cdH1cbn07XG5cblxuLyoqXG4qIGNhbGxOYXRpdmUgaXMgdXNlZCB0byBjYWxsIGEgbmF0aXZlIGZ1bmN0aW9uIGZyb20gSlMuXG4qIEBwYXJhbSAge3N0cmluZ30gICBuYW1lc3BhY2Ugb3IgbW9kdWxlIG5hbWUgb2YgdGhlIGhhbmRsaW5nIG1vZHVsZVxuKiBAcGFyYW0gIHtzdHJpbmd9ICAgZnVuY3Rpb25OYW1lIE5hbWUgb2YgdGhlIG5hdGl2ZSBmdW5jdGlvbi5cbiogQHBhcmFtICB7YW55fSAgIHBheWxvYWQgICAgICBQYXlsb2FkIHRvIGRlbGl2ZXIgdG8gdGhlIG5hdGl2ZSBmdW5jdGlvblxuKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2FsbGJhY2sgICAgIEpTIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgcmV0dXJuIHZhbHVlcyBmcm9tIG5hdGl2ZS5cbiovXG5Db3JlLnByb3RvdHlwZS5jYWxsTmF0aXZlID0gZnVuY3Rpb24obmFtZXNwYWNlLCBmdW5jdGlvbk5hbWUsIHBheWxvYWQsIGNhbGxiYWNrKSB7XG5cblx0aWYgKHRoaXMuY29uZmlnLmRlYnVnKSB7XG5cdFx0dGhpcy5pbmZvKFwiTmF0aXZlIGZ1bmN0aW9uIFwiICsgbmFtZXNwYWNlICsgXCIvXCIgKyBmdW5jdGlvbk5hbWUgKyBcIigpIGNhbGxlZC5cIik7XG5cdH1cblxuXHQvL0dldCBuYXRpdmUgbWV0aG9kIGRlZmluaXRpb25cblx0dmFyIG5hdGl2ZU1ldGhvZERlZmluaXRpb24gPSB0aGlzLmdldE5hdGl2ZU1ldGhvZERlZmluaXRpb24obmFtZXNwYWNlLCBmdW5jdGlvbk5hbWUpO1xuXG5cdC8vIGlzIG1ldGhvZCBkZWZpbmVkP1xuXHRpZiAobmF0aXZlTWV0aG9kRGVmaW5pdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5lcnJvcihuYW1lc3BhY2UgKyBcIi9cIiArIGZ1bmN0aW9uTmFtZSArIFwiKCkgaXMgbm90IGEgZGVmaW5lZCBtZXRob2QuXCIpO1xuXHRcdHJldHVybjtcblx0fVxuXG5cblx0aWYgKHR5cGVvZiBwYXlsb2FkID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0Y2FsbGJhY2sgPSBwYXlsb2FkO1xuXHRcdHBheWxvYWQgPSBudWxsO1xuXHR9XG5cblx0Ly8gaXMgcGF5bG9hZCB0eXBlIGNvcnJlY3Q/XG5cdGlmIChwcml2YXRlSGVscGVycy5pc05hdGl2ZU1ldGhvZFBheWxvYWRWYWxpZChuYXRpdmVNZXRob2REZWZpbml0aW9uLCBwYXlsb2FkKSA9PSBmYWxzZSkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cblx0aWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcblx0XHQvL0dlbmVyYXRlIHRlbXBvcmFyeSBrZXkgZm9yIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdFx0dmFyIGNhbGxiYWNrS2V5ID0gcHJpdmF0ZUhlbHBlcnMuZ2VuZXJhdGVJZCgpO1xuXHRcdG5hdGl2ZUNhbGxiYWNrRnVuY3Rpb25zW2NhbGxiYWNrS2V5XSA9IHtcblx0XHRcdGNhbGxlck5hbWVzcGFjZTogbmFtZXNwYWNlLFxuXHRcdFx0Y2FsbGVyRnVuY3Rpb25OYW1lOiBmdW5jdGlvbk5hbWUsXG5cdFx0XHRjYWxsYmFja0Z1bmN0aW9uOiBjYWxsYmFja1xuXHRcdH07XG5cdH1cblxuXHRwcml2YXRlSGVscGVycy5leGVjTmF0aXZlQ2FsbChuYXRpdmVNZXRob2REZWZpbml0aW9uLCBwYXlsb2FkLCBjYWxsYmFja0tleSk7XG59O1xuXG4vKipcbiogR2V0cyB0aGUgbmF0aXZlIG1ldGhvZCBkZWZpbml0aW9uIGZvciBhIGdpdmVuIGZ1bmN0aW9uIG5hbWUuIChNZXRob2QgZGVmaW5pdGlvbnMgYXJlIGRlZmluZWQgaW4gdGhlIGNvbmZpZyBvYmplY3QpXG4qIEBwYXJhbSAge3N0cmluZ30gZnVuY3Rpb25OYW1lIFRoZSBuYW1lIG9mIHRoZSBmdW5jdGlvbiB3aG9zIGRlZmluaXRpb24gaGFzIHRvIGJlIHJldHVybmVkLlxuKiBAcmV0dXJuIHtvYmplY3R9ICAgICAgICAgICAgICBGdW5jdGlvbiBkZWZpbml0aW9uIG9yIHVuZGVmaW5lZCBpZiBmdW5jdGlvbiBub3QgZm91bmQuXG4qL1xuQ29yZS5wcm90b3R5cGUuZ2V0TmF0aXZlTWV0aG9kRGVmaW5pdGlvbiA9IGZ1bmN0aW9uKG5hbWVzcGFjZSwgZnVuY3Rpb25OYW1lKSB7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jb25maWcubmF0aXZlTWV0aG9kc1tuYW1lc3BhY2VdLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIG1ldGhvZCA9IHRoaXMuY29uZmlnLm5hdGl2ZU1ldGhvZHNbbmFtZXNwYWNlXVtpXTtcblx0XHRpZiAobWV0aG9kLm5hbWUgPT0gZnVuY3Rpb25OYW1lKSB7XG5cdFx0XHRyZXR1cm4gbWV0aG9kO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gdW5kZWZpbmVkO1xufTtcblxuXG4vKipcbiogR2V0cyB0aGUgSlMgbWV0aG9kIGRlZmluaXRpb24gZm9yIGEgZ2l2ZW4gZnVuY3Rpb24gbmFtZS4gKE1ldGhvZCBkZWZpbml0aW9ucyBhcmUgZGVmaW5lZCBpbiB0aGUgY29uZmlnIG9iamVjdClcbiogQHBhcmFtICB7c3RyaW5nfSBmdW5jdGlvbk5hbWUgVGhlIG5hbWUgb2YgdGhlIGZ1bmN0aW9uIHdob3MgZGVmaW5pdGlvbiBoYXMgdG8gYmUgcmV0dXJuZWQuXG4qIEByZXR1cm4ge29iamVjdH0gICAgICAgICAgICAgIEZ1bmN0aW9uIGRlZmluaXRpb24gb3IgdW5kZWZpbmVkIGlmIGZ1bmN0aW9uIG5vdCBmb3VuZC5cbiovXG5Db3JlLnByb3RvdHlwZS5nZXRKU01ldGhvZERlZmluaXRpb24gPSBmdW5jdGlvbihuYW1lc3BhY2UsIGZ1bmN0aW9uTmFtZSkge1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY29uZmlnLkpTTWV0aG9kc1tuYW1lc3BhY2VdLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIG1ldGhvZCA9IHRoaXMuY29uZmlnLkpTTWV0aG9kc1tuYW1lc3BhY2VdW2ldO1xuXHRcdGlmIChtZXRob2QubmFtZSA9PSBmdW5jdGlvbk5hbWUpIHtcblx0XHRcdHJldHVybiBtZXRob2Q7XG5cdFx0fVxuXHR9XG5cdHJldHVybiB1bmRlZmluZWQ7XG59O1xuXG5cbi8vXG4vLyBFeHBvcnQgdGhlIFBlYWtDb3JlIGNsYXNzXG5tb2R1bGUuZXhwb3J0cyA9IENvcmU7XG4iLCJcbi8qKlxuICogQSBjb2xsZWN0aW9uIG9mIHByaXZhdGUgaGVscGVycyB0byBvcGVyYXRlIFBlYWtDb3JlLlxuICogQHBhcmFtIHtQZWFrQ29yZX0gY29yZSAgICAgICAgQSBQZWFrQ29yZSBpbnN0YW5jZVxuICovXG52YXIgUHJpdmF0ZUhlbHBlcnMgPSBmdW5jdGlvbihwZWFrLCBwcml2YXRlRGF0YSkge1xuICAgdGhpcy5jb3JlID0gcGVhaztcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYSBjZXJ0YWluIG1vZHVsZSB3YXMgaW5zdGFsbGVkIGFscmVhZHlcbiAqIEBwYXJhbSAge3N0cmluZ30gIG5hbWVzcGFjZSBUaGUgbmFtZXNwYWNlIG9mIHRoZSBtb2R1bGVcbiAqIEByZXR1cm4ge0Jvb2xlYW59ICAgICAgICAgICBUcnVlIG9mIEZhbHNlIGlmIG1vZHVsZXMgd2FzIGluc3RhbGxlZFxuICovXG5Qcml2YXRlSGVscGVycy5wcm90b3R5cGUuaXNNb2R1bGVJbnN0YWxsZWQgPSBmdW5jdGlvbiAobmFtZXNwYWNlKSB7XG4gICByZXR1cm4gISh0eXBlb2YodGhpcy5jb3JlLm1vZHVsZXNbbmFtZXNwYWNlXSkgPT0gJ3VuZGVmaW5lZCcpXG59O1xuXG5cblxuXG4vKipcbiAqIENoZWNrcyB3ZXRoZXIgYSBnaXZlbiBwYXlsb2FkIHR5cGUgbWF0Y2hlcyB0aGUgZGVmaW5pdGlvbiBpbiB0aGUgY29uZmlnIG9iamVjdCBmb3IgdGhhdCBtZXRob2QuXG4gKiBAcGFyYW0gIHtvYmplY3R9IG5hdGl2ZU1ldGhvZERlZmluaXRpb24gTWV0aG9kIGRlZmluaXRpb24gb2YgdGhlIG1ldGhvZCB3aGljaCBwYXlsb2FkIGhhcyB0byBiZSBjaGVja2VkLlxuICogQHBhcmFtICB7YW55fSBwYXlsb2FkICAgICAgICAgICAgICAgIFRoZSBwYXlsb2FkIGdpdmVuLlxuICogQHJldHVybiB7Ym9vbGVhbn0gICAgICAgICAgICAgICAgICAgICAgICB0cnVlIG9yIGZhbHNlIHdldGhlciB0aGUgZGVmaW5pdGlvbiBtYXRjaGVzIHRoZSBwYXlsb2FkIG9yIG5vdC5cbiAqL1xuUHJpdmF0ZUhlbHBlcnMucHJvdG90eXBlLmlzTmF0aXZlTWV0aG9kUGF5bG9hZFZhbGlkID0gZnVuY3Rpb24obmF0aXZlTWV0aG9kRGVmaW5pdGlvbiwgcGF5bG9hZCkge1xuXG5cdC8vRG8gbm90IGNoZWNrIGluIHByb2R1Y3Rpb24gbW9kZVxuXHRpZighdGhpcy5jb3JlLmNvbmZpZy5kZWJ1Zyl7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuICAgLy8gaWYgd2UgZG9uJ3Qgc3BlY2lmeSBhIHBheWxvYWRUeXBlIGluIHRoZSBtZXRob2QgZGVmaW5pdGlvbiwgd2Ugc2V0IGl0IHRvIG5vbmUgbWFudWFsbHlcbiAgIGlmICh0eXBlb2YobmF0aXZlTWV0aG9kRGVmaW5pdGlvbi5wYXlsb2FkKSA9PSAndW5kZWZpbmVkJykge1xuICAgICAgbmF0aXZlTWV0aG9kRGVmaW5pdGlvbi5wYXlsb2FkID0ge1xuICAgICAgICAgZGF0YVR5cGU6ICdub25lJ1xuICAgICAgfVxuICAgfVxuXG5cdGlmIChwYXlsb2FkID09IG51bGwpIHtcblx0XHRpZiAgKG5hdGl2ZU1ldGhvZERlZmluaXRpb24ucGF5bG9hZC5kYXRhVHlwZSAhPSAnbm9uZScpIHtcblx0XHRcdHRoaXMuY29yZS5sb2dnZXIuZXJyb3IobmF0aXZlTWV0aG9kRGVmaW5pdGlvbi5uYW1lICsgJyg8JysgdHlwZSArJz4pIFR5cGUgbWlzbWF0Y2guIEV4cGVjdGVkIDwnKyBuYXRpdmVNZXRob2REZWZpbml0aW9uLnBheWxvYWQuZGF0YVR5cGUgKyc+Jyk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblxuXHR2YXIgdHlwZSA9IHR5cGVvZihwYXlsb2FkKTtcblxuXHRpZiAodHlwZSA9PSAnb2JqZWN0JyAmJiBwYXlsb2FkLmxlbmd0aCAhPT0gdW5kZWZpbmVkKSB7IC8vIGlmIGFycmF5XG5cdFx0dHlwZSA9ICdhcnJheSc7XG5cdH1cblxuXHRpZiAodHlwZSAhPSBuYXRpdmVNZXRob2REZWZpbml0aW9uLnBheWxvYWQuZGF0YVR5cGUpIHtcblx0XHR0aGlzLmNvcmUubG9nZ2VyLmVycm9yKG5hdGl2ZU1ldGhvZERlZmluaXRpb24ubmFtZSArICcoPCcrIHR5cGUgKyc+KSBUeXBlIG1pc21hdGNoLiBFeHBlY3RlZCA8JysgbmF0aXZlTWV0aG9kRGVmaW5pdGlvbi5wYXlsb2FkLmRhdGFUeXBlICsnPicpO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8vQ2hlY2sgcGF5bG9hZERhdGEgZm9yIG9iamVjdHNcblx0aWYgKHR5cGUgPT0gJ29iamVjdCcpe1xuXHRcdGlmIChuYXRpdmVNZXRob2REZWZpbml0aW9uLnBheWxvYWQuZGF0YSA9PT0gdW5kZWZpbmVkKXtcblx0XHRcdHRoaXMuY29yZS5sb2dnZXIuZXJyb3IobmF0aXZlTWV0aG9kRGVmaW5pdGlvbi5uYW1lICsgXCJQYXlsb2FkRGF0YSBub3QgZGVjbGFyZWQhXCIpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRmb3IgKHZhciBrZXkgaW4gbmF0aXZlTWV0aG9kRGVmaW5pdGlvbi5wYXlsb2FkLmRhdGEpIHtcblx0XHRcdGlmICgoa2V5IGluIHBheWxvYWQpID09IGZhbHNlKSB7XG5cdFx0XHRcdHRoaXMuY29yZS5sb2dnZXIuZXJyb3IobmF0aXZlTWV0aG9kRGVmaW5pdGlvbi5uYW1lICsgXCJQYXlsb2FkRGF0YSBtaXNtYXRjaCEgRXhwZWN0ZWQgPCdcIiArIGtleSArIFwiJz5cIik7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0fVxuXG5cdH1cblxuXHRyZXR1cm4gdHJ1ZTtcblxufTtcblxuLyoqXG4gKiBDaGVja3Mgd2V0aGVyIHRoZSBnaXZlbiBkYXRhIGZyb20gYSBjYWxsYmFjayBtYXRjaGVzIHRoZSBtZXRob2QgZGVmaW5pdGlvbi5cbiAqIEBwYXJhbSAge29iamVjdH0gSlNNZXRob2REZWZpbml0aW9uIE1ldGhvZCBkZWZpbml0aW9uIGZvciB0aGUgY2FsbGVkIGpzIGZ1bmN0aW9uLlxuICogQHBhcmFtICB7W3R5cGVdfSBqc29uRGF0YSAgICAgICAgIENhbGxiYWNrIHBheWxvYWRcbiAqIEByZXR1cm4ge2Jvb2xlYW59ICAgICAgICAgICAgICAgICAgdHJ1ZSBvciBmYWxzZVxuICovXG5Qcml2YXRlSGVscGVycy5wcm90b3R5cGUuaXNDYWxsYmFja0RhdGFWYWxpZEZvck1ldGhvZERlZmluaXRpb24gPSBmdW5jdGlvbihKU01ldGhvZERlZmluaXRpb24sIGpzb25EYXRhKSB7XG5cblx0Ly9EbyBub3QgY2hlY2sgaW4gcHJvZHVjdGlvbiBtb2RlXG5cdGlmKCF0aGlzLmNvcmUuY29uZmlnLmRlYnVnKXtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdC8vVXNlZCBmb3IgVlVFL0pTIEZ1bmN0aW9ucyB3aXRob3V0IGEgY2FsbGJhY2tcblx0aWYoSlNNZXRob2REZWZpbml0aW9uID09PSB1bmRlZmluZWQgJiYganNvbkRhdGEgPT09IHVuZGVmaW5lZCl7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuICAgdmFyIGNhbGxiYWNrRGVmaW5pdGlvbiA9IEpTTWV0aG9kRGVmaW5pdGlvbi5jYWxsYmFjaztcblxuICAgaWYgKHR5cGVvZihjYWxsYmFja0RlZmluaXRpb24pID09ICd1bmRlZmluZWQnICYmIGpzb25EYXRhKSB7XG4gICAgICB0aGlzLmNvcmUubG9nZ2VyLmVycm9yKEpTTWV0aG9kRGVmaW5pdGlvbi5uYW1lc3BhY2UgKyBcIi9cIiArIEpTTWV0aG9kRGVmaW5pdGlvbi5uYW1lICsgJyBoYXMgbm8gZGVmaW5lZCBjYWxsYmFjayBpbiBpdFxcJ3MgbWV0aG9kIGRlZmluaXRpb24uJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICB9XG5cblx0aWYgKHR5cGVvZihjYWxsYmFja0RlZmluaXRpb24pID09ICd1bmRlZmluZWQnICYmIHR5cGVvZihqc29uRGF0YSkgPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdHZhciB0eXBlID0gdHlwZW9mKGpzb25EYXRhKTtcblx0aWYgKHR5cGUgPT0gJ29iamVjdCcgJiYganNvbkRhdGEubGVuZ3RoICE9PSB1bmRlZmluZWQpIHsgLy8gaWYgYXJyYXlcblx0XHR0eXBlID0gJ2FycmF5Jztcblx0fVxuXG5cdGlmICh0eXBlICE9IGNhbGxiYWNrRGVmaW5pdGlvbi5kYXRhVHlwZSkge1xuXHRcdHRoaXMuY29yZS5sb2dnZXIuZXJyb3IoSlNNZXRob2REZWZpbml0aW9uLm5hbWVzcGFjZSArIFwiL1wiICsgSlNNZXRob2REZWZpbml0aW9uLm5hbWUgKyAnKDwnKyB0eXBlICsnPikgY2FsbGJhY2sgZGF0YSB0eXBlIG1pc21hdGNoLiBFeHBlY3RlZCA8JysgY2FsbGJhY2tEZWZpbml0aW9uLmRhdGFUeXBlICsnPicpO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdGlmKHR5cGUgPT0gJ29iamVjdCcpe1xuXHRcdGZvciAodmFyIGtleSBpbiBjYWxsYmFja0RlZmluaXRpb24uZGF0YSkge1xuXHRcdFx0aWYgKChrZXkgaW4ganNvbkRhdGEpID09IGZhbHNlKSB7XG5cdFx0XHRcdHRoaXMuY29yZS5sb2dnZXIuZXJyb3IoSlNNZXRob2REZWZpbml0aW9uLm5hbWVzcGFjZSArIFwiL1wiICsgSlNNZXRob2REZWZpbml0aW9uLm5hbWUgKyBcIkNhbGxiYWNrRGF0YSBtaXNtYXRjaCEgRXhwZWN0ZWQgPCdcIiArIGtleSArIFwiJz5cIik7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogSW52b2tlcyBhIG5hdGl2ZSBtZXRob2QuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWVzcGFjZSAgICAgICAgICAgICAgVGhlIG5hbWVzcGFjZSBvZiB0aGUgbmF0aXZlIG1ldGhvZCB0byBjYWxsLlxuICogQHBhcmFtICB7b2JqZWN0fSBuYXRpdmVNZXRob2REZWZpbml0aW9uIE1ldGhvZCBkZWZpbml0aW9uIGZvciBuYXRpdmUgZnVuY3Rpb25cbiAqIEBwYXJhbSAge2FueX0gcGF5bG9hZCAgICAgICAgICAgICAgICAgICBOYXRpdmUgbWV0aG9kIHBheWxvYWRcbiAqIEBwYXJhbSAge3N0cmluZ30gY2FsbGJhY2tLZXkgICAgICAgICAgICBKUyBDYWxsYmFjayBmdW5jdGlvbiBuYW1lLlxuICovXG5Qcml2YXRlSGVscGVycy5wcm90b3R5cGUuZXhlY05hdGl2ZUNhbGwgPSBmdW5jdGlvbihuYXRpdmVNZXRob2REZWZpbml0aW9uLCBwYXlsb2FkLCBjYWxsYmFja0tleSkge1xuXG5cblx0aWYgKHRoaXMuY29yZS5oZWxwZXJzLmlzaU9TKCkpIHtcblxuICAgICAgaWYgKHR5cGVvZih3aW5kb3cpID09ICd1bmRlZmluZWQnIHx8IHR5cGVvZih3aW5kb3cud2Via2l0KSA9PSAndW5kZWZpbmVkJyB8fCB0eXBlb2Yod2luZG93LndlYmtpdC5tZXNzYWdlSGFuZGxlcnMpID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICBjb25zb2xlLmVycm9yKHRoaXMuY29yZS5jb25maWcubmFtZSArIFwiLWlvcyBkb2VzIG5vdCBleGlzdCFcIik7XG4gICAgICAgICByZXR1cm47XG5cdFx0fVxuICAgICAgXG4gICAgICBpZihwYXlsb2FkID09PSBudWxsIHx8IHBheWxvYWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgcGF5bG9hZCA9IFwiXCI7XG4gICAgICB9XG5cblx0XHR3aW5kb3cud2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5QZWFrQ29yZS5wb3N0TWVzc2FnZSh7XG4gICAgICAgICBtZXRob2REZWZpbml0aW9uOiBuYXRpdmVNZXRob2REZWZpbml0aW9uLFxuXHRcdFx0cGF5bG9hZDogcGF5bG9hZCxcblx0XHRcdGNhbGxiYWNrS2V5OiBjYWxsYmFja0tleVxuXHRcdH0pO1xuXG5cdH0gZWxzZSBpZiAodGhpcy5jb3JlLmhlbHBlcnMuaXNBbmRyb2lkKCkpIHtcblxuXHRcdGlmICh0eXBlb2YoUGVha0NvcmUpID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICBcdGNvbnNvbGUuZXJyb3IodGhpcy5jb3JlLmNvbmZpZy5uYW1lICsgXCItYW5kcm9pZCBkb2VzIG5vdCBleGlzdCFcIik7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHRyeXtcbiAgICAgICAgIGlmKHBheWxvYWQgPT09IG51bGwgfHwgcGF5bG9hZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwYXlsb2FkID0gXCJudWxsXCI7XG4gICAgICAgICB9XG4gICAgICAgICBpZihjYWxsYmFja0tleSA9PT0gbnVsbCB8fCBjYWxsYmFja0tleSA9PT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgIGNhbGxiYWNrS2V5ID0gXCJudWxsXCJcbiAgICAgICAgIH1cblx0XHRcdC8vSW52b2tlIG5hdGl2ZSBmdW5jdGlvbiBuYW1lXG4gICAgICAgICAvL0NvbnZlcnQgT2JqZWN0cyB0byBTdHJpbmdcblx0XHRcdGlmKHR5cGVvZihwYXlsb2FkKSA9PSAnb2JqZWN0Jyl7XG5cdFx0XHRcdHBheWxvYWQgPSBKU09OLnN0cmluZ2lmeShwYXlsb2FkKTtcblx0XHRcdH1cblx0XHRcdFBlYWtDb3JlWydpbnZva2VOYXRpdmVNZXRob2QnXShKU09OLnN0cmluZ2lmeShuYXRpdmVNZXRob2REZWZpbml0aW9uKSwgcGF5bG9hZCwgY2FsbGJhY2tLZXkpO1xuXHRcdH1jYXRjaChlKXtcblx0XHRcdGNvbnNvbGUuZXJyb3IobmF0aXZlTWV0aG9kRGVmaW5pdGlvbi5uYW1lc3BhY2UgKyBcIi9cIiArIG5hdGl2ZU1ldGhvZERlZmluaXRpb24ubmFtZSArIFwiKCkuIEFuZHJvaWQgSW50ZXJmYWNlIG1ldGhvZCBub3QgZGVmaW5lZC5cIilcblx0XHR9XG5cdH1cbn07XG5cbi8qKlxuICogR2VuZXJhdGVzIGEgcmFuZG9tIGZ1bmN0aW9uIG5hbWVcbiAqIEByZXR1cm4ge3N0cmluZ30gUmFuZG9tIGZ1bmN0aW9uIG5hbWVcbiAqL1xuUHJpdmF0ZUhlbHBlcnMucHJvdG90eXBlLmdlbmVyYXRlSWQgPSBmdW5jdGlvbigpIHtcbiAgIHZhciBjaWQgPSBcIl9fcGVha0NhbGxiYWNrXCI7XG4gICB2YXIgY2hhcnMgPSBcIkFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXpcIjtcbiAgIGZvciggdmFyIGk9MDsgaSA8IDg7IGkrKyApIHtcbiAgICAgIGNpZCArPSBjaGFycy5jaGFyQXQoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY2hhcnMubGVuZ3RoKSk7XG4gICB9XG4gICByZXR1cm4gY2lkO1xufTtcblxuXG4vKipcbiAqIENvbnZlcnRzIGFueSBzdHJpbmcgaW50byBjYW1lbENhc2UuXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyIFN0cmluZyB0byBjb252ZXJ0IHRvIGNhbWVsQ2FzZS5cbiAqIEByZXR1cm4ge3N0cmluZ30gQ29udmVydGVkIFN0cmluZ1xuICovXG5Qcml2YXRlSGVscGVycy5wcm90b3R5cGUudG9DYW1lbENhc2UgPSBmdW5jdGlvbihzdHIpIHtcbiAgICByZXR1cm4gc3RyLnJlcGxhY2UoL14oW0EtWl0pfFtcXHMtX10oXFx3KS9nLCBmdW5jdGlvbihtYXRjaCwgcDEsIHAyLCBvZmZzZXQpIHtcbiAgICAgICAgaWYgKHAyKSByZXR1cm4gcDIudG9VcHBlckNhc2UoKTtcbiAgICAgICAgcmV0dXJuIHAxLnRvTG93ZXJDYXNlKCk7XG4gICAgfSk7XG59O1xuXG5cbi8qKlxuICogTWVyZ2VzIHR3byBKUyBvYmplY3RzLlxuICogQHBhcmFtICB7T2JqZWN0fSBvYmoxIEZpcnN0IG9iamVjdFxuICogQHBhcmFtICB7T2JqZWN0fSBvYmoyIFNlY29uZCBvYmplY3RcbiAqIEByZXR1cm4ge09iamVjdH0gICAgICBSZXN1bHQgb2JqZWN0XG4gKi9cblByaXZhdGVIZWxwZXJzLnByb3RvdHlwZS5tZXJnZU9iamVjdCA9IGZ1bmN0aW9uIChvYmoxLCBvYmoyKSB7XG4gIGZvciAodmFyIHAgaW4gb2JqMikge1xuICAgIHRyeSB7XG4gICAgICAvLyBQcm9wZXJ0eSBpbiBkZXN0aW5hdGlvbiBvYmplY3Qgc2V0OyB1cGRhdGUgaXRzIHZhbHVlLlxuICAgICAgaWYgKCBvYmoyW3BdLmNvbnN0cnVjdG9yPT1PYmplY3QgKSB7XG4gICAgICAgIG9iajFbcF0gPSBNZXJnZVJlY3Vyc2l2ZShvYmoxW3BdLCBvYmoyW3BdKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9iajFbcF0gPSBvYmoyW3BdO1xuXG4gICAgICB9XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICAvLyBQcm9wZXJ0eSBpbiBkZXN0aW5hdGlvbiBvYmplY3Qgbm90IHNldDsgY3JlYXRlIGl0IGFuZCBzZXQgaXRzIHZhbHVlLlxuICAgICAgb2JqMVtwXSA9IG9iajJbcF07XG5cbiAgICB9XG4gIH1cbiAgcmV0dXJuIG9iajE7XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBQcml2YXRlSGVscGVycztcbiIsIlxuXG52YXIgU2hhcmVkID0gZnVuY3Rpb24gU2hhcmVkKHBlYWspIHtcblxuICAgaWYgKHBlYWsgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc29sZS5lcnJvcihcInNoYXJlZC5qcyAtIE5vIFBlYWtDb3JlIGluc3RhbmNlIGdpdmVuIVwiKTtcbiAgIH1cblxuICAgdGhpcy5wZWFrID0gcGVhaztcbiAgIHRoaXMuZGF0YSA9IHt9O1xuXG4gICBsZXQgdGhhdCA9IHRoaXM7XG4gICB0aGlzLnBlYWsubW9kdWxlc1sncGVha0NvcmUnXS5zZXRTaGFyZWRWYWx1ZSA9IGZ1bmN0aW9uKHBheWxvYWQpIHtcbiAgICAgIHRoYXQuZGF0YVtwYXlsb2FkLmtleV0gPSBwYXlsb2FkLnZhbHVlXG4gICB9XG5cbiAgIHRoaXMucGVhay5jYWxsTmF0aXZlKCdwZWFrQ29yZScsICdnZXRTaGFyZWRTdG9yZScsIGZ1bmN0aW9uKHN0b3JlKSB7XG4gICAgICB0aGlzLmRhdGEgPSBzdG9yZTtcbiAgIH0pXG5cbiAgIHRoaXMucGVhay5tb2R1bGVzWydwZWFrQ29yZSddLnNldFNoYXJlZFZhbHVlID0gZnVuY3Rpb24ocGF5bG9hZCkge1xuICAgICAgdGhhdC5kYXRhW3BheWxvYWQua2V5XSA9IHBheWxvYWQudmFsdWVcbiAgIH1cblxufVxuXG5TaGFyZWQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKGtleSkge1xuICAgbGV0IHRlc3QgPSB0aGlzLmRhdGFba2V5XTtcbiAgIHJldHVybiB0ZXN0O1xufVxuXG5TaGFyZWQucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgIHRoaXMuZGF0YVtrZXldID0gdmFsdWU7XG4gICB0aGlzLnBlYWsuY2FsbE5hdGl2ZSgncGVha0NvcmUnLCAnc2V0U2hhcmVkVmFsdWUnLCB7XG4gICAgICAgJ2tleSc6IGtleSxcbiAgICAgICAndmFsdWUnIDogdmFsdWVcbiAgICB9KTtcbn1cblxuU2hhcmVkLnByb3RvdHlwZS5zZXRQZXJzaXN0ZW50ID0gZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgdGhpcy5kYXRhW2tleV0gPSB2YWx1ZTtcbiAgIHRoaXMucGVhay5jYWxsTmF0aXZlKCdwZWFrQ29yZScsICdzZXRTaGFyZWRQZXJzaXN0ZW50VmFsdWUnLCB7XG4gICAgICAgJ2tleSc6IGtleSxcbiAgICAgICAndmFsdWUnIDogdmFsdWUsXG4gICAgICAgJ3NlY3VyZScgOiBmYWxzZVxuICAgIH0pO1xufVxuXG5TaGFyZWQucHJvdG90eXBlLnNldFBlcnNpc3RlbnRTZWN1cmUgPSBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICB0aGlzLmRhdGFba2V5XSA9IHZhbHVlO1xuICAgdGhpcy5wZWFrLmNhbGxOYXRpdmUoJ3BlYWtDb3JlJywgJ3NldFNoYXJlZFBlcnNpc3RlbnRWYWx1ZScsIHtcbiAgICAgICAna2V5Jzoga2V5LFxuICAgICAgICd2YWx1ZScgOiB2YWx1ZSxcbiAgICAgICAnc2VjdXJlJyA6IHRydWVcbiAgICB9KTtcbn1cbm1vZHVsZS5leHBvcnRzID0gU2hhcmVkXG4iLCJtb2R1bGUuZXhwb3J0cz17XG4gIFwibmFtZVwiOiBcIkBiaXRtZWNoYW5pY3MvcGVhay1jb3JlXCIsXG4gIFwidmVyc2lvblwiOiBcIjEuMC4xNFwiLFxuICBcImRlc2NyaXB0aW9uXCI6IFwiUEVBSyBDb3JlIGlzIHRoZSBjb3JlIG1vZHVsZSB0aGF0IGhhbmRsZXMgbmF0aXZlIDw+IGpzIGNvbW11bmljYXRpb25zIGFuZCBhIGxvZ2dpbmcgcHJveHkuXCIsXG4gIFwibWFpblwiOiBcImluZGV4LmpzXCIsXG4gIFwicmVwb3NpdG9yeVwiOiB7XG4gICAgXCJ0eXBlXCI6IFwiZ2l0XCIsXG4gICAgXCJ1cmxcIjogXCJnaXQraHR0cHM6Ly9yb2Jpbi1iaXRtZWNoYW5pY3NAYml0YnVja2V0Lm9yZy9iaXRtZWNoYW5pY3NnbWJoL3BlYWstY29yZS5naXRcIlxuICB9LFxuICBcImF1dGhvclwiOiBcIlJvYmluIFJlaXRlciAmIE1hdHRoaWFzIEhlcm1hbm5cIixcbiAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwianNvbi1sb2FkZXJcIjogXCJeMC41LjRcIlxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgbmljZUZ1bmN0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgY29uc29sZS5sb2coXCJJIGFtIGEgbmljZSBmdW5jdGlvbiFcIilcbiAgfVxufTtcbiIsIlxuXG4vLyBpbml0aWFsaXplIHBlYWtcbi8vIGNvbnN0IFBlYWtDb3JlID0gcmVxdWlyZSgnQGJpdG1lY2hhbmljcy9wZWFrLWNvcmUnKTtcbmNvbnN0IFBlYWtDb3JlID0gcmVxdWlyZSgnLi4vLi4vLi4vcGVhay1jb3JlL2xpYi9wZWFrLWNvcmUnKTtcbmNvbnN0IHBlYWsgPSBuZXcgUGVha0NvcmUoKTtcbnBlYWsuY29uZmlnLmRlYnVnID0gZmFsc2U7XG5wZWFrLm1ha2VHbG9iYWwoJ3BlYWsnKTtcblxuLy8gTG9hZCB0aGUgdXNlcmxhbmQgbW9kdWxlIGFuZCB0aGUgbWV0aG9kcyB0aGF0IHlvdSBuZWVkIGZvciB0aGlzIGNvbXBvbmVudC5cbmNvbnN0IG1ldGhvZERlZmluaXRpb25zID0gcmVxdWlyZSgnLi9tZXRob2QtZGVmaW5pdGlvbnMnKTtcbmNvbnN0IHBlYWtVc2VybGFuZCA9IHBlYWsudXNlTW9kdWxlKHJlcXVpcmUoJ0BiaXRtZWNoYW5pY3MvcGVhay11c2VybGFuZCcpLCBtZXRob2REZWZpbml0aW9ucyk7XG5cbi8vIExvYWQgd2hhdGV2ZXIgbGlicmFyeSB5b3UgbGlrZSB0aHJvdWdoIG5wbVxuY29uc3QgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxuLy8gTG9hZCBKUyBjb2RlIGZyb20gX3NoYXJlZF9tb2R1bGVzXG5jb25zdCBNeUxpYnJhcnkgPSByZXF1aXJlKCcuLi9fc2hhcmVkX21vZHVsZXMvbXktbGlicmFyeScpO1xuTXlMaWJyYXJ5Lm5pY2VGdW5jdGlvbigpO1xuXG4vLyBCaW5kIGEgSlMgbWV0aG9kIHNvIHRoZSBuYXRpdmUgc2lkZSBjYW4gY2FsbCBpdFxucGVha1VzZXJsYW5kLmJpbmQoJ3NvcnQnLCBmdW5jdGlvbihhcnJheUlmTnVtYmVycykge1xuICAgcmV0dXJuIF8uc29ydEJ5KGFycmF5SWZOdW1iZXJzLCBmdW5jdGlvbihudW0pXG4gICB7XG4gICAgICByZXR1cm4gTWF0aC5zaW4obnVtKVxuICAgfSk7XG59KTtcblxuXG5cbi8vIHBlYWsuc2V0KCdrZXknLCAndmFsdWUnKVxuLy8gcGVhay5nZXQoJ2tleScsICh2YWx1ZSkgPT4ge1xuLy8gICAgcGVhay5pbmZvKFwiSVlGIFwiICsgdmFsdWUpXG4vLyB9KVxuLy9cblxuLy8gcGVhay5pbmZvKFwiVG9wIFNlY3JldCBcIiArIHBlYWsuZ2V0KCdzZWN1cmUtdG9rZW4nKSlcbi8vIHBlYWsuc2V0UGVyc2lzdGVudCgnc29tZS1wZXJzaXN0ZW50LXZhbHVlJywgJ0hpIScpXG4vLyBwZWFrLnNldFBlcnNpc3RlbnRTZWN1cmUoJ3NlY3VyZS10b2tlbicsICdJIGFtIHZlcnkgc2VjdXJlIScpXG5cbi8vIEFsd2F5cyB0cmlnZ2VyIG9uUmVhZHkoKSBvbmNlIHlvdXIgY29kZSBpcyByZWFkeS5cbi8vVGhpcyB0ZWxscyB0aGUgcGVhayBlY29zeXN0ZW0gKGVzcGVjaWFsbHkgdGhlIHBlYWsgbmF0aXZlIHNpZGUpIHRoYXQgeW91IGFyZSByZWFkeSFcbnBlYWsub25SZWFkeSgpO1xuXG4vLyBzZXRUaW1lb3V0KCgpID0+IHtcbi8vICAgIGNvbnNvbGUubG9nKFwiR2V0IE15S2V5IFwiICsgcGVhay5nZXQoXCJNeUtleVwiKSlcbi8vICAgIHBlYWsuaW5mbyhwZWFrLmdldChcIk15S2V5XCIpKVxuLy8gfSwgMjAwMClcblxuLy8gRXhlY3V0ZSBhIG5hdGl2ZSBtZXRob2Rcbi8vIHBlYWtVc2VybGFuZC5kaXNwbGF5VGltZShEYXRlLm5vdygpKVxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICBuYXRpdmU6IFtcbiAgICAgIFxuICAgXSxcbiAgIGpzOiBbXG4gICAgICB7XG4gICAgICAgICBuYW1lOiAnc29ydCcsXG4gICAgICAgICBwYXlsb2FkOiB7XG4gICAgICAgICAgICBkYXRhVHlwZTogJ2FycmF5J1xuICAgICAgICAgfSxcbiAgICAgICAgIGNhbGxiYWNrOiB7XG4gICAgICAgICAgICBkYXRhVHlwZTogJ2FycmF5J1xuICAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgIG5hbWU6ICdkaXNwbGF5VGltZScsXG4gICAgICAgICBwYXlsb2FkOiB7XG4gICAgICAgICAgICBkYXRhVHlwZTogJ3N0cmluZydcbiAgICAgICAgIH1cbiAgICAgIH1cbiAgIF1cbn1cbiIsInZhciBjb25maWcgPSB7XG4gICAgXCJza2lwSlNNZXRob2RWYWxpZGF0aW9uT25JbnN0YWxsXCIgOiB0cnVlLFxuICAgIFwiZ2VuZXJhdGVGdW5jdGlvblN0dWJzXCI6IHRydWUsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gY29uZmlnOyIsIm1vZHVsZS5leHBvcnRzPXtcbiAgXCJfYXJnc1wiOiBbXG4gICAgW1xuICAgICAgXCJAYml0bWVjaGFuaWNzL3BlYWstdXNlcmxhbmRAXjEuMC4xXCIsXG4gICAgICBcIi9Vc2Vycy9yb2Jpbi9Eb2N1bWVudHMvRmlybWEvTGF1ZmVuZGUgUHJvamVrdGUvZmFsa2VtZWRpYSBHbWJIL0hvbWVDb25uZWN0L0pTUG9ydC9mbS1zaW1wbHl5dW1teS1wZWFrXCJcbiAgICBdXG4gIF0sXG4gIFwiX2Zyb21cIjogXCJAYml0bWVjaGFuaWNzL3BlYWstdXNlcmxhbmRAPj0xLjAuMSA8Mi4wLjBcIixcbiAgXCJfaWRcIjogXCJAYml0bWVjaGFuaWNzL3BlYWstdXNlcmxhbmRAMS4wLjFcIixcbiAgXCJfaW5DYWNoZVwiOiB0cnVlLFxuICBcIl9pbnN0YWxsYWJsZVwiOiB0cnVlLFxuICBcIl9sb2NhdGlvblwiOiBcIi9AYml0bWVjaGFuaWNzL3BlYWstdXNlcmxhbmRcIixcbiAgXCJfbm9kZVZlcnNpb25cIjogXCI2LjIuMFwiLFxuICBcIl9ucG1PcGVyYXRpb25hbEludGVybmFsXCI6IHtcbiAgICBcImhvc3RcIjogXCJwYWNrYWdlcy0xNi1lYXN0LmludGVybmFsLm5wbWpzLmNvbVwiLFxuICAgIFwidG1wXCI6IFwidG1wL3BlYWstdXNlcmxhbmQtMS4wLjEudGd6XzE0NjU5Mjc3Nzg3OTZfMC40MTEwMTM5MzQ1Mjg0NTUxNFwiXG4gIH0sXG4gIFwiX25wbVVzZXJcIjoge1xuICAgIFwiZW1haWxcIjogXCJyb2JpbkBiaXRtZWNoYW5pY3MuZGVcIixcbiAgICBcIm5hbWVcIjogXCJyb2JpbjczMzFcIlxuICB9LFxuICBcIl9ucG1WZXJzaW9uXCI6IFwiMy43LjVcIixcbiAgXCJfcGhhbnRvbUNoaWxkcmVuXCI6IHt9LFxuICBcIl9yZXF1ZXN0ZWRcIjoge1xuICAgIFwibmFtZVwiOiBcIkBiaXRtZWNoYW5pY3MvcGVhay11c2VybGFuZFwiLFxuICAgIFwicmF3XCI6IFwiQGJpdG1lY2hhbmljcy9wZWFrLXVzZXJsYW5kQF4xLjAuMVwiLFxuICAgIFwicmF3U3BlY1wiOiBcIl4xLjAuMVwiLFxuICAgIFwic2NvcGVcIjogXCJAYml0bWVjaGFuaWNzXCIsXG4gICAgXCJzcGVjXCI6IFwiPj0xLjAuMSA8Mi4wLjBcIixcbiAgICBcInR5cGVcIjogXCJyYW5nZVwiXG4gIH0sXG4gIFwiX3JlcXVpcmVkQnlcIjogW1xuICAgIFwiL1wiXG4gIF0sXG4gIFwiX3NoYXN1bVwiOiBcIjViMDhhNDZkZDgwYzgxYmYwNjYxOGNlZGE3NGIxNTdiNTA4ZTA1OTBcIixcbiAgXCJfc2hyaW5rd3JhcFwiOiBudWxsLFxuICBcIl9zcGVjXCI6IFwiQGJpdG1lY2hhbmljcy9wZWFrLXVzZXJsYW5kQF4xLjAuMVwiLFxuICBcIl93aGVyZVwiOiBcIi9Vc2Vycy9yb2Jpbi9Eb2N1bWVudHMvRmlybWEvTGF1ZmVuZGUgUHJvamVrdGUvZmFsa2VtZWRpYSBHbWJIL0hvbWVDb25uZWN0L0pTUG9ydC9mbS1zaW1wbHl5dW1teS1wZWFrXCIsXG4gIFwiYXV0aG9yXCI6IHtcbiAgICBcIm5hbWVcIjogXCJSb2JpbiBSZWl0ZXIgJiBNYXR0aGlhcyBIZXJtYW5uXCJcbiAgfSxcbiAgXCJkZXBlbmRlbmNpZXNcIjoge30sXG4gIFwiZGVzY3JpcHRpb25cIjogXCIjIyBJbnN0YWxsYXRpb24gIyNcIixcbiAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge30sXG4gIFwiZGlyZWN0b3JpZXNcIjoge30sXG4gIFwiZGlzdFwiOiB7XG4gICAgXCJzaGFzdW1cIjogXCI1YjA4YTQ2ZGQ4MGM4MWJmMDY2MThjZWRhNzRiMTU3YjUwOGUwNTkwXCIsXG4gICAgXCJ0YXJiYWxsXCI6IFwiaHR0cHM6Ly9yZWdpc3RyeS5ucG1qcy5vcmcvQGJpdG1lY2hhbmljcy9wZWFrLXVzZXJsYW5kLy0vcGVhay11c2VybGFuZC0xLjAuMS50Z3pcIlxuICB9LFxuICBcIm1haW5cIjogXCJwZWFrLXVzZXJsYW5kLmpzXCIsXG4gIFwibWFpbnRhaW5lcnNcIjogW1xuICAgIHtcbiAgICAgIFwiZW1haWxcIjogXCJyb2JpbkBiaXRtZWNoYW5pY3MuZGVcIixcbiAgICAgIFwibmFtZVwiOiBcInJvYmluNzMzMVwiXG4gICAgfSxcbiAgICB7XG4gICAgICBcImVtYWlsXCI6IFwidWJvb3RmZW5zdGVyQGdvb2dsZW1haWwuY29tXCIsXG4gICAgICBcIm5hbWVcIjogXCJ0d2l0dGFkcm9ja1wiXG4gICAgfVxuICBdLFxuICBcIm5hbWVcIjogXCJAYml0bWVjaGFuaWNzL3BlYWstdXNlcmxhbmRcIixcbiAgXCJvcHRpb25hbERlcGVuZGVuY2llc1wiOiB7fSxcbiAgXCJyZWFkbWVcIjogXCJFUlJPUjogTm8gUkVBRE1FIGRhdGEgZm91bmQhXCIsXG4gIFwic2NyaXB0c1wiOiB7XG4gICAgXCJ0ZXN0XCI6IFwiZWNobyBcXFwiRXJyb3I6IG5vIHRlc3Qgc3BlY2lmaWVkXFxcIiAmJiBleGl0IDFcIlxuICB9LFxuICBcInZlcnNpb25cIjogXCIxLjAuMVwiXG59XG4iLCJ2YXIgUGVha01vZHVsZSA9IGZ1bmN0aW9uIChwZWFrLCBjdXN0b21EYXRhKSB7XG4gICB0aGlzLnBhY2thZ2VKU09OID0gcmVxdWlyZSgnLi9wYWNrYWdlLmpzb24nKTtcbiAgIHRoaXMuY29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcnKTtcbiAgIHRoaXMucGVhayA9IHBlYWs7XG4gICB0aGlzLm5hdGl2ZU1ldGhvZHMgPSBjdXN0b21EYXRhLm5hdGl2ZTtcbiAgIHRoaXMuSlNNZXRob2RzID0gY3VzdG9tRGF0YS5qcztcbn1cblxuXG4vKipcbiAqIEJpbmRzIGEgY3VzdG9tIEpTIGZ1bmN0aW9uIHRvIHRoZSBQZWFrQ29yZSBzeXN0ZW0uXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGZ1bmN0aW9uTmFtZSBUaGUgbmFtZSBvZiB0aGUgZnVuY3Rpb24uXG4gKiBAcGFyYW0gIHtvYmplY3R9IGZ1bmMgICAgICAgICBUaGUgZnVuY3Rpb24gaXRzZWxmLlxuICovXG5QZWFrTW9kdWxlLnByb3RvdHlwZS5iaW5kID0gZnVuY3Rpb24oZnVuY3Rpb25OYW1lLCBmdW5jKXtcblxuXHR2YXIgSlNNZXRob2REZWZpbml0aW9uID0gdGhpcy5wZWFrLmdldEpTTWV0aG9kRGVmaW5pdGlvbihcInBlYWtVc2VybGFuZFwiLGZ1bmN0aW9uTmFtZSk7XG5cblx0aWYoSlNNZXRob2REZWZpbml0aW9uID09PSB1bmRlZmluZWQpe1xuXHRcdHRoaXMuX2Vycm9yKGZ1bmN0aW9uTmFtZSArXCIoKSBpcyBub3QgZGVjbGFyZWQgaW4gbWV0aG9kIGRlZmluaXRpb25zIVwiKVxuXHRcdHJldHVybjtcblx0fVxuXG5cdC8vUmVnaXN0ZXIgYSBjYWxsYWJsZSBKUyBGdW5jdGlvbiB0aGF0IHNpbXBseSBicm9hZGNhc3RzIGFuIGV2ZW50IHRoYXQgaGFzIHRoZSBzYW1lIG5hbWUgYXMgdGhlIGZ1bmN0aW9uXG5cdHRoaXNbZnVuY3Rpb25OYW1lXSA9IGZ1bmM7XG5cdGlmKHRoaXMucGVhay5jb25maWcuZGVidWcpe1xuXHRcdHRoaXMuX2luZm8oZnVuY3Rpb25OYW1lICsgXCIoKSBoYXMgYmVlbiBiaW5kZWQgdG8gXCIgKyB0aGlzLm5hbWUpO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBlYWtNb2R1bGU7XG4iLCIvLyAgICAgVW5kZXJzY29yZS5qcyAxLjcuMFxuLy8gICAgIGh0dHA6Ly91bmRlcnNjb3JlanMub3JnXG4vLyAgICAgKGMpIDIwMDktMjAxNCBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuLy8gICAgIFVuZGVyc2NvcmUgbWF5IGJlIGZyZWVseSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG5cbihmdW5jdGlvbigpIHtcblxuICAvLyBCYXNlbGluZSBzZXR1cFxuICAvLyAtLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEVzdGFibGlzaCB0aGUgcm9vdCBvYmplY3QsIGB3aW5kb3dgIGluIHRoZSBicm93c2VyLCBvciBgZXhwb3J0c2Agb24gdGhlIHNlcnZlci5cbiAgdmFyIHJvb3QgPSB0aGlzO1xuXG4gIC8vIFNhdmUgdGhlIHByZXZpb3VzIHZhbHVlIG9mIHRoZSBgX2AgdmFyaWFibGUuXG4gIHZhciBwcmV2aW91c1VuZGVyc2NvcmUgPSByb290Ll87XG5cbiAgLy8gU2F2ZSBieXRlcyBpbiB0aGUgbWluaWZpZWQgKGJ1dCBub3QgZ3ppcHBlZCkgdmVyc2lvbjpcbiAgdmFyIEFycmF5UHJvdG8gPSBBcnJheS5wcm90b3R5cGUsIE9ialByb3RvID0gT2JqZWN0LnByb3RvdHlwZSwgRnVuY1Byb3RvID0gRnVuY3Rpb24ucHJvdG90eXBlO1xuXG4gIC8vIENyZWF0ZSBxdWljayByZWZlcmVuY2UgdmFyaWFibGVzIGZvciBzcGVlZCBhY2Nlc3MgdG8gY29yZSBwcm90b3R5cGVzLlxuICB2YXJcbiAgICBwdXNoICAgICAgICAgICAgID0gQXJyYXlQcm90by5wdXNoLFxuICAgIHNsaWNlICAgICAgICAgICAgPSBBcnJheVByb3RvLnNsaWNlLFxuICAgIGNvbmNhdCAgICAgICAgICAgPSBBcnJheVByb3RvLmNvbmNhdCxcbiAgICB0b1N0cmluZyAgICAgICAgID0gT2JqUHJvdG8udG9TdHJpbmcsXG4gICAgaGFzT3duUHJvcGVydHkgICA9IE9ialByb3RvLmhhc093blByb3BlcnR5O1xuXG4gIC8vIEFsbCAqKkVDTUFTY3JpcHQgNSoqIG5hdGl2ZSBmdW5jdGlvbiBpbXBsZW1lbnRhdGlvbnMgdGhhdCB3ZSBob3BlIHRvIHVzZVxuICAvLyBhcmUgZGVjbGFyZWQgaGVyZS5cbiAgdmFyXG4gICAgbmF0aXZlSXNBcnJheSAgICAgID0gQXJyYXkuaXNBcnJheSxcbiAgICBuYXRpdmVLZXlzICAgICAgICAgPSBPYmplY3Qua2V5cyxcbiAgICBuYXRpdmVCaW5kICAgICAgICAgPSBGdW5jUHJvdG8uYmluZDtcblxuICAvLyBDcmVhdGUgYSBzYWZlIHJlZmVyZW5jZSB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QgZm9yIHVzZSBiZWxvdy5cbiAgdmFyIF8gPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqIGluc3RhbmNlb2YgXykgcmV0dXJuIG9iajtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgXykpIHJldHVybiBuZXcgXyhvYmopO1xuICAgIHRoaXMuX3dyYXBwZWQgPSBvYmo7XG4gIH07XG5cbiAgLy8gRXhwb3J0IHRoZSBVbmRlcnNjb3JlIG9iamVjdCBmb3IgKipOb2RlLmpzKiosIHdpdGhcbiAgLy8gYmFja3dhcmRzLWNvbXBhdGliaWxpdHkgZm9yIHRoZSBvbGQgYHJlcXVpcmUoKWAgQVBJLiBJZiB3ZSdyZSBpblxuICAvLyB0aGUgYnJvd3NlciwgYWRkIGBfYCBhcyBhIGdsb2JhbCBvYmplY3QuXG4gIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IF87XG4gICAgfVxuICAgIGV4cG9ydHMuXyA9IF87XG4gIH0gZWxzZSB7XG4gICAgcm9vdC5fID0gXztcbiAgfVxuXG4gIC8vIEN1cnJlbnQgdmVyc2lvbi5cbiAgXy5WRVJTSU9OID0gJzEuNy4wJztcblxuICAvLyBJbnRlcm5hbCBmdW5jdGlvbiB0aGF0IHJldHVybnMgYW4gZWZmaWNpZW50IChmb3IgY3VycmVudCBlbmdpbmVzKSB2ZXJzaW9uXG4gIC8vIG9mIHRoZSBwYXNzZWQtaW4gY2FsbGJhY2ssIHRvIGJlIHJlcGVhdGVkbHkgYXBwbGllZCBpbiBvdGhlciBVbmRlcnNjb3JlXG4gIC8vIGZ1bmN0aW9ucy5cbiAgdmFyIGNyZWF0ZUNhbGxiYWNrID0gZnVuY3Rpb24oZnVuYywgY29udGV4dCwgYXJnQ291bnQpIHtcbiAgICBpZiAoY29udGV4dCA9PT0gdm9pZCAwKSByZXR1cm4gZnVuYztcbiAgICBzd2l0Y2ggKGFyZ0NvdW50ID09IG51bGwgPyAzIDogYXJnQ291bnQpIHtcbiAgICAgIGNhc2UgMTogcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBmdW5jLmNhbGwoY29udGV4dCwgdmFsdWUpO1xuICAgICAgfTtcbiAgICAgIGNhc2UgMjogcmV0dXJuIGZ1bmN0aW9uKHZhbHVlLCBvdGhlcikge1xuICAgICAgICByZXR1cm4gZnVuYy5jYWxsKGNvbnRleHQsIHZhbHVlLCBvdGhlcik7XG4gICAgICB9O1xuICAgICAgY2FzZSAzOiByZXR1cm4gZnVuY3Rpb24odmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBmdW5jLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKTtcbiAgICAgIH07XG4gICAgICBjYXNlIDQ6IHJldHVybiBmdW5jdGlvbihhY2N1bXVsYXRvciwgdmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBmdW5jLmNhbGwoY29udGV4dCwgYWNjdW11bGF0b3IsIHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbik7XG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZnVuYy5hcHBseShjb250ZXh0LCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gQSBtb3N0bHktaW50ZXJuYWwgZnVuY3Rpb24gdG8gZ2VuZXJhdGUgY2FsbGJhY2tzIHRoYXQgY2FuIGJlIGFwcGxpZWRcbiAgLy8gdG8gZWFjaCBlbGVtZW50IGluIGEgY29sbGVjdGlvbiwgcmV0dXJuaW5nIHRoZSBkZXNpcmVkIHJlc3VsdCDigJQgZWl0aGVyXG4gIC8vIGlkZW50aXR5LCBhbiBhcmJpdHJhcnkgY2FsbGJhY2ssIGEgcHJvcGVydHkgbWF0Y2hlciwgb3IgYSBwcm9wZXJ0eSBhY2Nlc3Nvci5cbiAgXy5pdGVyYXRlZSA9IGZ1bmN0aW9uKHZhbHVlLCBjb250ZXh0LCBhcmdDb3VudCkge1xuICAgIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gXy5pZGVudGl0eTtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHZhbHVlKSkgcmV0dXJuIGNyZWF0ZUNhbGxiYWNrKHZhbHVlLCBjb250ZXh0LCBhcmdDb3VudCk7XG4gICAgaWYgKF8uaXNPYmplY3QodmFsdWUpKSByZXR1cm4gXy5tYXRjaGVzKHZhbHVlKTtcbiAgICByZXR1cm4gXy5wcm9wZXJ0eSh2YWx1ZSk7XG4gIH07XG5cbiAgLy8gQ29sbGVjdGlvbiBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBUaGUgY29ybmVyc3RvbmUsIGFuIGBlYWNoYCBpbXBsZW1lbnRhdGlvbiwgYWthIGBmb3JFYWNoYC5cbiAgLy8gSGFuZGxlcyByYXcgb2JqZWN0cyBpbiBhZGRpdGlvbiB0byBhcnJheS1saWtlcy4gVHJlYXRzIGFsbFxuICAvLyBzcGFyc2UgYXJyYXktbGlrZXMgYXMgaWYgdGhleSB3ZXJlIGRlbnNlLlxuICBfLmVhY2ggPSBfLmZvckVhY2ggPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gb2JqO1xuICAgIGl0ZXJhdGVlID0gY3JlYXRlQ2FsbGJhY2soaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgIHZhciBpLCBsZW5ndGggPSBvYmoubGVuZ3RoO1xuICAgIGlmIChsZW5ndGggPT09ICtsZW5ndGgpIHtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpdGVyYXRlZShvYmpbaV0sIGksIG9iaik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgICBmb3IgKGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGl0ZXJhdGVlKG9ialtrZXlzW2ldXSwga2V5c1tpXSwgb2JqKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIHJlc3VsdHMgb2YgYXBwbHlpbmcgdGhlIGl0ZXJhdGVlIHRvIGVhY2ggZWxlbWVudC5cbiAgXy5tYXAgPSBfLmNvbGxlY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gW107XG4gICAgaXRlcmF0ZWUgPSBfLml0ZXJhdGVlKGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICB2YXIga2V5cyA9IG9iai5sZW5ndGggIT09ICtvYmoubGVuZ3RoICYmIF8ua2V5cyhvYmopLFxuICAgICAgICBsZW5ndGggPSAoa2V5cyB8fCBvYmopLmxlbmd0aCxcbiAgICAgICAgcmVzdWx0cyA9IEFycmF5KGxlbmd0aCksXG4gICAgICAgIGN1cnJlbnRLZXk7XG4gICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgY3VycmVudEtleSA9IGtleXMgPyBrZXlzW2luZGV4XSA6IGluZGV4O1xuICAgICAgcmVzdWx0c1tpbmRleF0gPSBpdGVyYXRlZShvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaik7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIHZhciByZWR1Y2VFcnJvciA9ICdSZWR1Y2Ugb2YgZW1wdHkgYXJyYXkgd2l0aCBubyBpbml0aWFsIHZhbHVlJztcblxuICAvLyAqKlJlZHVjZSoqIGJ1aWxkcyB1cCBhIHNpbmdsZSByZXN1bHQgZnJvbSBhIGxpc3Qgb2YgdmFsdWVzLCBha2EgYGluamVjdGAsXG4gIC8vIG9yIGBmb2xkbGAuXG4gIF8ucmVkdWNlID0gXy5mb2xkbCA9IF8uaW5qZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgbWVtbywgY29udGV4dCkge1xuICAgIGlmIChvYmogPT0gbnVsbCkgb2JqID0gW107XG4gICAgaXRlcmF0ZWUgPSBjcmVhdGVDYWxsYmFjayhpdGVyYXRlZSwgY29udGV4dCwgNCk7XG4gICAgdmFyIGtleXMgPSBvYmoubGVuZ3RoICE9PSArb2JqLmxlbmd0aCAmJiBfLmtleXMob2JqKSxcbiAgICAgICAgbGVuZ3RoID0gKGtleXMgfHwgb2JqKS5sZW5ndGgsXG4gICAgICAgIGluZGV4ID0gMCwgY3VycmVudEtleTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDMpIHtcbiAgICAgIGlmICghbGVuZ3RoKSB0aHJvdyBuZXcgVHlwZUVycm9yKHJlZHVjZUVycm9yKTtcbiAgICAgIG1lbW8gPSBvYmpba2V5cyA/IGtleXNbaW5kZXgrK10gOiBpbmRleCsrXTtcbiAgICB9XG4gICAgZm9yICg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICBjdXJyZW50S2V5ID0ga2V5cyA/IGtleXNbaW5kZXhdIDogaW5kZXg7XG4gICAgICBtZW1vID0gaXRlcmF0ZWUobWVtbywgb2JqW2N1cnJlbnRLZXldLCBjdXJyZW50S2V5LCBvYmopO1xuICAgIH1cbiAgICByZXR1cm4gbWVtbztcbiAgfTtcblxuICAvLyBUaGUgcmlnaHQtYXNzb2NpYXRpdmUgdmVyc2lvbiBvZiByZWR1Y2UsIGFsc28ga25vd24gYXMgYGZvbGRyYC5cbiAgXy5yZWR1Y2VSaWdodCA9IF8uZm9sZHIgPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBtZW1vLCBjb250ZXh0KSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSBvYmogPSBbXTtcbiAgICBpdGVyYXRlZSA9IGNyZWF0ZUNhbGxiYWNrKGl0ZXJhdGVlLCBjb250ZXh0LCA0KTtcbiAgICB2YXIga2V5cyA9IG9iai5sZW5ndGggIT09ICsgb2JqLmxlbmd0aCAmJiBfLmtleXMob2JqKSxcbiAgICAgICAgaW5kZXggPSAoa2V5cyB8fCBvYmopLmxlbmd0aCxcbiAgICAgICAgY3VycmVudEtleTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDMpIHtcbiAgICAgIGlmICghaW5kZXgpIHRocm93IG5ldyBUeXBlRXJyb3IocmVkdWNlRXJyb3IpO1xuICAgICAgbWVtbyA9IG9ialtrZXlzID8ga2V5c1stLWluZGV4XSA6IC0taW5kZXhdO1xuICAgIH1cbiAgICB3aGlsZSAoaW5kZXgtLSkge1xuICAgICAgY3VycmVudEtleSA9IGtleXMgPyBrZXlzW2luZGV4XSA6IGluZGV4O1xuICAgICAgbWVtbyA9IGl0ZXJhdGVlKG1lbW8sIG9ialtjdXJyZW50S2V5XSwgY3VycmVudEtleSwgb2JqKTtcbiAgICB9XG4gICAgcmV0dXJuIG1lbW87XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBmaXJzdCB2YWx1ZSB3aGljaCBwYXNzZXMgYSB0cnV0aCB0ZXN0LiBBbGlhc2VkIGFzIGBkZXRlY3RgLlxuICBfLmZpbmQgPSBfLmRldGVjdCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdDtcbiAgICBwcmVkaWNhdGUgPSBfLml0ZXJhdGVlKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgXy5zb21lKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAocHJlZGljYXRlKHZhbHVlLCBpbmRleCwgbGlzdCkpIHtcbiAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGFsbCB0aGUgZWxlbWVudHMgdGhhdCBwYXNzIGEgdHJ1dGggdGVzdC5cbiAgLy8gQWxpYXNlZCBhcyBgc2VsZWN0YC5cbiAgXy5maWx0ZXIgPSBfLnNlbGVjdCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHRzO1xuICAgIHByZWRpY2F0ZSA9IF8uaXRlcmF0ZWUocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICBfLmVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmIChwcmVkaWNhdGUodmFsdWUsIGluZGV4LCBsaXN0KSkgcmVzdWx0cy5wdXNoKHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBSZXR1cm4gYWxsIHRoZSBlbGVtZW50cyBmb3Igd2hpY2ggYSB0cnV0aCB0ZXN0IGZhaWxzLlxuICBfLnJlamVjdCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKG9iaiwgXy5uZWdhdGUoXy5pdGVyYXRlZShwcmVkaWNhdGUpKSwgY29udGV4dCk7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIHdoZXRoZXIgYWxsIG9mIHRoZSBlbGVtZW50cyBtYXRjaCBhIHRydXRoIHRlc3QuXG4gIC8vIEFsaWFzZWQgYXMgYGFsbGAuXG4gIF8uZXZlcnkgPSBfLmFsbCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gdHJ1ZTtcbiAgICBwcmVkaWNhdGUgPSBfLml0ZXJhdGVlKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgdmFyIGtleXMgPSBvYmoubGVuZ3RoICE9PSArb2JqLmxlbmd0aCAmJiBfLmtleXMob2JqKSxcbiAgICAgICAgbGVuZ3RoID0gKGtleXMgfHwgb2JqKS5sZW5ndGgsXG4gICAgICAgIGluZGV4LCBjdXJyZW50S2V5O1xuICAgIGZvciAoaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgY3VycmVudEtleSA9IGtleXMgPyBrZXlzW2luZGV4XSA6IGluZGV4O1xuICAgICAgaWYgKCFwcmVkaWNhdGUob2JqW2N1cnJlbnRLZXldLCBjdXJyZW50S2V5LCBvYmopKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIC8vIERldGVybWluZSBpZiBhdCBsZWFzdCBvbmUgZWxlbWVudCBpbiB0aGUgb2JqZWN0IG1hdGNoZXMgYSB0cnV0aCB0ZXN0LlxuICAvLyBBbGlhc2VkIGFzIGBhbnlgLlxuICBfLnNvbWUgPSBfLmFueSA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgcHJlZGljYXRlID0gXy5pdGVyYXRlZShwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIHZhciBrZXlzID0gb2JqLmxlbmd0aCAhPT0gK29iai5sZW5ndGggJiYgXy5rZXlzKG9iaiksXG4gICAgICAgIGxlbmd0aCA9IChrZXlzIHx8IG9iaikubGVuZ3RoLFxuICAgICAgICBpbmRleCwgY3VycmVudEtleTtcbiAgICBmb3IgKGluZGV4ID0gMDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIGN1cnJlbnRLZXkgPSBrZXlzID8ga2V5c1tpbmRleF0gOiBpbmRleDtcbiAgICAgIGlmIChwcmVkaWNhdGUob2JqW2N1cnJlbnRLZXldLCBjdXJyZW50S2V5LCBvYmopKSByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gIC8vIERldGVybWluZSBpZiB0aGUgYXJyYXkgb3Igb2JqZWN0IGNvbnRhaW5zIGEgZ2l2ZW4gdmFsdWUgKHVzaW5nIGA9PT1gKS5cbiAgLy8gQWxpYXNlZCBhcyBgaW5jbHVkZWAuXG4gIF8uY29udGFpbnMgPSBfLmluY2x1ZGUgPSBmdW5jdGlvbihvYmosIHRhcmdldCkge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChvYmoubGVuZ3RoICE9PSArb2JqLmxlbmd0aCkgb2JqID0gXy52YWx1ZXMob2JqKTtcbiAgICByZXR1cm4gXy5pbmRleE9mKG9iaiwgdGFyZ2V0KSA+PSAwO1xuICB9O1xuXG4gIC8vIEludm9rZSBhIG1ldGhvZCAod2l0aCBhcmd1bWVudHMpIG9uIGV2ZXJ5IGl0ZW0gaW4gYSBjb2xsZWN0aW9uLlxuICBfLmludm9rZSA9IGZ1bmN0aW9uKG9iaiwgbWV0aG9kKSB7XG4gICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgdmFyIGlzRnVuYyA9IF8uaXNGdW5jdGlvbihtZXRob2QpO1xuICAgIHJldHVybiBfLm1hcChvYmosIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gKGlzRnVuYyA/IG1ldGhvZCA6IHZhbHVlW21ldGhvZF0pLmFwcGx5KHZhbHVlLCBhcmdzKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBtYXBgOiBmZXRjaGluZyBhIHByb3BlcnR5LlxuICBfLnBsdWNrID0gZnVuY3Rpb24ob2JqLCBrZXkpIHtcbiAgICByZXR1cm4gXy5tYXAob2JqLCBfLnByb3BlcnR5KGtleSkpO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYGZpbHRlcmA6IHNlbGVjdGluZyBvbmx5IG9iamVjdHNcbiAgLy8gY29udGFpbmluZyBzcGVjaWZpYyBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy53aGVyZSA9IGZ1bmN0aW9uKG9iaiwgYXR0cnMpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIob2JqLCBfLm1hdGNoZXMoYXR0cnMpKTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBmaW5kYDogZ2V0dGluZyB0aGUgZmlyc3Qgb2JqZWN0XG4gIC8vIGNvbnRhaW5pbmcgc3BlY2lmaWMgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8uZmluZFdoZXJlID0gZnVuY3Rpb24ob2JqLCBhdHRycykge1xuICAgIHJldHVybiBfLmZpbmQob2JqLCBfLm1hdGNoZXMoYXR0cnMpKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG1heGltdW0gZWxlbWVudCAob3IgZWxlbWVudC1iYXNlZCBjb21wdXRhdGlvbikuXG4gIF8ubWF4ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHQgPSAtSW5maW5pdHksIGxhc3RDb21wdXRlZCA9IC1JbmZpbml0eSxcbiAgICAgICAgdmFsdWUsIGNvbXB1dGVkO1xuICAgIGlmIChpdGVyYXRlZSA9PSBudWxsICYmIG9iaiAhPSBudWxsKSB7XG4gICAgICBvYmogPSBvYmoubGVuZ3RoID09PSArb2JqLmxlbmd0aCA/IG9iaiA6IF8udmFsdWVzKG9iaik7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gb2JqLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhbHVlID0gb2JqW2ldO1xuICAgICAgICBpZiAodmFsdWUgPiByZXN1bHQpIHtcbiAgICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpdGVyYXRlZSA9IF8uaXRlcmF0ZWUoaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgICAgXy5lYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICAgIGNvbXB1dGVkID0gaXRlcmF0ZWUodmFsdWUsIGluZGV4LCBsaXN0KTtcbiAgICAgICAgaWYgKGNvbXB1dGVkID4gbGFzdENvbXB1dGVkIHx8IGNvbXB1dGVkID09PSAtSW5maW5pdHkgJiYgcmVzdWx0ID09PSAtSW5maW5pdHkpIHtcbiAgICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgICBsYXN0Q29tcHV0ZWQgPSBjb21wdXRlZDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBtaW5pbXVtIGVsZW1lbnQgKG9yIGVsZW1lbnQtYmFzZWQgY29tcHV0YXRpb24pLlxuICBfLm1pbiA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0ID0gSW5maW5pdHksIGxhc3RDb21wdXRlZCA9IEluZmluaXR5LFxuICAgICAgICB2YWx1ZSwgY29tcHV0ZWQ7XG4gICAgaWYgKGl0ZXJhdGVlID09IG51bGwgJiYgb2JqICE9IG51bGwpIHtcbiAgICAgIG9iaiA9IG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoID8gb2JqIDogXy52YWx1ZXMob2JqKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBvYmoubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFsdWUgPSBvYmpbaV07XG4gICAgICAgIGlmICh2YWx1ZSA8IHJlc3VsdCkge1xuICAgICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGl0ZXJhdGVlID0gXy5pdGVyYXRlZShpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgICBfLmVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgICAgY29tcHV0ZWQgPSBpdGVyYXRlZSh2YWx1ZSwgaW5kZXgsIGxpc3QpO1xuICAgICAgICBpZiAoY29tcHV0ZWQgPCBsYXN0Q29tcHV0ZWQgfHwgY29tcHV0ZWQgPT09IEluZmluaXR5ICYmIHJlc3VsdCA9PT0gSW5maW5pdHkpIHtcbiAgICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgICBsYXN0Q29tcHV0ZWQgPSBjb21wdXRlZDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gU2h1ZmZsZSBhIGNvbGxlY3Rpb24sIHVzaW5nIHRoZSBtb2Rlcm4gdmVyc2lvbiBvZiB0aGVcbiAgLy8gW0Zpc2hlci1ZYXRlcyBzaHVmZmxlXShodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0Zpc2hlcuKAk1lhdGVzX3NodWZmbGUpLlxuICBfLnNodWZmbGUgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgc2V0ID0gb2JqICYmIG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoID8gb2JqIDogXy52YWx1ZXMob2JqKTtcbiAgICB2YXIgbGVuZ3RoID0gc2V0Lmxlbmd0aDtcbiAgICB2YXIgc2h1ZmZsZWQgPSBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGluZGV4ID0gMCwgcmFuZDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIHJhbmQgPSBfLnJhbmRvbSgwLCBpbmRleCk7XG4gICAgICBpZiAocmFuZCAhPT0gaW5kZXgpIHNodWZmbGVkW2luZGV4XSA9IHNodWZmbGVkW3JhbmRdO1xuICAgICAgc2h1ZmZsZWRbcmFuZF0gPSBzZXRbaW5kZXhdO1xuICAgIH1cbiAgICByZXR1cm4gc2h1ZmZsZWQ7XG4gIH07XG5cbiAgLy8gU2FtcGxlICoqbioqIHJhbmRvbSB2YWx1ZXMgZnJvbSBhIGNvbGxlY3Rpb24uXG4gIC8vIElmICoqbioqIGlzIG5vdCBzcGVjaWZpZWQsIHJldHVybnMgYSBzaW5nbGUgcmFuZG9tIGVsZW1lbnQuXG4gIC8vIFRoZSBpbnRlcm5hbCBgZ3VhcmRgIGFyZ3VtZW50IGFsbG93cyBpdCB0byB3b3JrIHdpdGggYG1hcGAuXG4gIF8uc2FtcGxlID0gZnVuY3Rpb24ob2JqLCBuLCBndWFyZCkge1xuICAgIGlmIChuID09IG51bGwgfHwgZ3VhcmQpIHtcbiAgICAgIGlmIChvYmoubGVuZ3RoICE9PSArb2JqLmxlbmd0aCkgb2JqID0gXy52YWx1ZXMob2JqKTtcbiAgICAgIHJldHVybiBvYmpbXy5yYW5kb20ob2JqLmxlbmd0aCAtIDEpXTtcbiAgICB9XG4gICAgcmV0dXJuIF8uc2h1ZmZsZShvYmopLnNsaWNlKDAsIE1hdGgubWF4KDAsIG4pKTtcbiAgfTtcblxuICAvLyBTb3J0IHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24gcHJvZHVjZWQgYnkgYW4gaXRlcmF0ZWUuXG4gIF8uc29ydEJ5ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgIGl0ZXJhdGVlID0gXy5pdGVyYXRlZShpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgcmV0dXJuIF8ucGx1Y2soXy5tYXAob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgaW5kZXg6IGluZGV4LFxuICAgICAgICBjcml0ZXJpYTogaXRlcmF0ZWUodmFsdWUsIGluZGV4LCBsaXN0KVxuICAgICAgfTtcbiAgICB9KS5zb3J0KGZ1bmN0aW9uKGxlZnQsIHJpZ2h0KSB7XG4gICAgICB2YXIgYSA9IGxlZnQuY3JpdGVyaWE7XG4gICAgICB2YXIgYiA9IHJpZ2h0LmNyaXRlcmlhO1xuICAgICAgaWYgKGEgIT09IGIpIHtcbiAgICAgICAgaWYgKGEgPiBiIHx8IGEgPT09IHZvaWQgMCkgcmV0dXJuIDE7XG4gICAgICAgIGlmIChhIDwgYiB8fCBiID09PSB2b2lkIDApIHJldHVybiAtMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBsZWZ0LmluZGV4IC0gcmlnaHQuaW5kZXg7XG4gICAgfSksICd2YWx1ZScpO1xuICB9O1xuXG4gIC8vIEFuIGludGVybmFsIGZ1bmN0aW9uIHVzZWQgZm9yIGFnZ3JlZ2F0ZSBcImdyb3VwIGJ5XCIgb3BlcmF0aW9ucy5cbiAgdmFyIGdyb3VwID0gZnVuY3Rpb24oYmVoYXZpb3IpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgICAgaXRlcmF0ZWUgPSBfLml0ZXJhdGVlKGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICAgIF8uZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICB2YXIga2V5ID0gaXRlcmF0ZWUodmFsdWUsIGluZGV4LCBvYmopO1xuICAgICAgICBiZWhhdmlvcihyZXN1bHQsIHZhbHVlLCBrZXkpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gR3JvdXBzIHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24uIFBhc3MgZWl0aGVyIGEgc3RyaW5nIGF0dHJpYnV0ZVxuICAvLyB0byBncm91cCBieSwgb3IgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlIGNyaXRlcmlvbi5cbiAgXy5ncm91cEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCB2YWx1ZSwga2V5KSB7XG4gICAgaWYgKF8uaGFzKHJlc3VsdCwga2V5KSkgcmVzdWx0W2tleV0ucHVzaCh2YWx1ZSk7IGVsc2UgcmVzdWx0W2tleV0gPSBbdmFsdWVdO1xuICB9KTtcblxuICAvLyBJbmRleGVzIHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24sIHNpbWlsYXIgdG8gYGdyb3VwQnlgLCBidXQgZm9yXG4gIC8vIHdoZW4geW91IGtub3cgdGhhdCB5b3VyIGluZGV4IHZhbHVlcyB3aWxsIGJlIHVuaXF1ZS5cbiAgXy5pbmRleEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCB2YWx1ZSwga2V5KSB7XG4gICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgfSk7XG5cbiAgLy8gQ291bnRzIGluc3RhbmNlcyBvZiBhbiBvYmplY3QgdGhhdCBncm91cCBieSBhIGNlcnRhaW4gY3JpdGVyaW9uLiBQYXNzXG4gIC8vIGVpdGhlciBhIHN0cmluZyBhdHRyaWJ1dGUgdG8gY291bnQgYnksIG9yIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZVxuICAvLyBjcml0ZXJpb24uXG4gIF8uY291bnRCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwgdmFsdWUsIGtleSkge1xuICAgIGlmIChfLmhhcyhyZXN1bHQsIGtleSkpIHJlc3VsdFtrZXldKys7IGVsc2UgcmVzdWx0W2tleV0gPSAxO1xuICB9KTtcblxuICAvLyBVc2UgYSBjb21wYXJhdG9yIGZ1bmN0aW9uIHRvIGZpZ3VyZSBvdXQgdGhlIHNtYWxsZXN0IGluZGV4IGF0IHdoaWNoXG4gIC8vIGFuIG9iamVjdCBzaG91bGQgYmUgaW5zZXJ0ZWQgc28gYXMgdG8gbWFpbnRhaW4gb3JkZXIuIFVzZXMgYmluYXJ5IHNlYXJjaC5cbiAgXy5zb3J0ZWRJbmRleCA9IGZ1bmN0aW9uKGFycmF5LCBvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0ZWUgPSBfLml0ZXJhdGVlKGl0ZXJhdGVlLCBjb250ZXh0LCAxKTtcbiAgICB2YXIgdmFsdWUgPSBpdGVyYXRlZShvYmopO1xuICAgIHZhciBsb3cgPSAwLCBoaWdoID0gYXJyYXkubGVuZ3RoO1xuICAgIHdoaWxlIChsb3cgPCBoaWdoKSB7XG4gICAgICB2YXIgbWlkID0gbG93ICsgaGlnaCA+Pj4gMTtcbiAgICAgIGlmIChpdGVyYXRlZShhcnJheVttaWRdKSA8IHZhbHVlKSBsb3cgPSBtaWQgKyAxOyBlbHNlIGhpZ2ggPSBtaWQ7XG4gICAgfVxuICAgIHJldHVybiBsb3c7XG4gIH07XG5cbiAgLy8gU2FmZWx5IGNyZWF0ZSBhIHJlYWwsIGxpdmUgYXJyYXkgZnJvbSBhbnl0aGluZyBpdGVyYWJsZS5cbiAgXy50b0FycmF5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFvYmopIHJldHVybiBbXTtcbiAgICBpZiAoXy5pc0FycmF5KG9iaikpIHJldHVybiBzbGljZS5jYWxsKG9iaik7XG4gICAgaWYgKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSByZXR1cm4gXy5tYXAob2JqLCBfLmlkZW50aXR5KTtcbiAgICByZXR1cm4gXy52YWx1ZXMob2JqKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG51bWJlciBvZiBlbGVtZW50cyBpbiBhbiBvYmplY3QuXG4gIF8uc2l6ZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIDA7XG4gICAgcmV0dXJuIG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoID8gb2JqLmxlbmd0aCA6IF8ua2V5cyhvYmopLmxlbmd0aDtcbiAgfTtcblxuICAvLyBTcGxpdCBhIGNvbGxlY3Rpb24gaW50byB0d28gYXJyYXlzOiBvbmUgd2hvc2UgZWxlbWVudHMgYWxsIHNhdGlzZnkgdGhlIGdpdmVuXG4gIC8vIHByZWRpY2F0ZSwgYW5kIG9uZSB3aG9zZSBlbGVtZW50cyBhbGwgZG8gbm90IHNhdGlzZnkgdGhlIHByZWRpY2F0ZS5cbiAgXy5wYXJ0aXRpb24gPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHByZWRpY2F0ZSA9IF8uaXRlcmF0ZWUocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICB2YXIgcGFzcyA9IFtdLCBmYWlsID0gW107XG4gICAgXy5lYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGtleSwgb2JqKSB7XG4gICAgICAocHJlZGljYXRlKHZhbHVlLCBrZXksIG9iaikgPyBwYXNzIDogZmFpbCkucHVzaCh2YWx1ZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIFtwYXNzLCBmYWlsXTtcbiAgfTtcblxuICAvLyBBcnJheSBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gR2V0IHRoZSBmaXJzdCBlbGVtZW50IG9mIGFuIGFycmF5LiBQYXNzaW5nICoqbioqIHdpbGwgcmV0dXJuIHRoZSBmaXJzdCBOXG4gIC8vIHZhbHVlcyBpbiB0aGUgYXJyYXkuIEFsaWFzZWQgYXMgYGhlYWRgIGFuZCBgdGFrZWAuIFRoZSAqKmd1YXJkKiogY2hlY2tcbiAgLy8gYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgXy5tYXBgLlxuICBfLmZpcnN0ID0gXy5oZWFkID0gXy50YWtlID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiB2b2lkIDA7XG4gICAgaWYgKG4gPT0gbnVsbCB8fCBndWFyZCkgcmV0dXJuIGFycmF5WzBdO1xuICAgIGlmIChuIDwgMCkgcmV0dXJuIFtdO1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCAwLCBuKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGV2ZXJ5dGhpbmcgYnV0IHRoZSBsYXN0IGVudHJ5IG9mIHRoZSBhcnJheS4gRXNwZWNpYWxseSB1c2VmdWwgb25cbiAgLy8gdGhlIGFyZ3VtZW50cyBvYmplY3QuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gYWxsIHRoZSB2YWx1ZXMgaW5cbiAgLy8gdGhlIGFycmF5LCBleGNsdWRpbmcgdGhlIGxhc3QgTi4gVGhlICoqZ3VhcmQqKiBjaGVjayBhbGxvd3MgaXQgdG8gd29yayB3aXRoXG4gIC8vIGBfLm1hcGAuXG4gIF8uaW5pdGlhbCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCAwLCBNYXRoLm1heCgwLCBhcnJheS5sZW5ndGggLSAobiA9PSBudWxsIHx8IGd1YXJkID8gMSA6IG4pKSk7XG4gIH07XG5cbiAgLy8gR2V0IHRoZSBsYXN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gdGhlIGxhc3QgTlxuICAvLyB2YWx1ZXMgaW4gdGhlIGFycmF5LiBUaGUgKipndWFyZCoqIGNoZWNrIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5sYXN0ID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiB2b2lkIDA7XG4gICAgaWYgKG4gPT0gbnVsbCB8fCBndWFyZCkgcmV0dXJuIGFycmF5W2FycmF5Lmxlbmd0aCAtIDFdO1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCBNYXRoLm1heChhcnJheS5sZW5ndGggLSBuLCAwKSk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBldmVyeXRoaW5nIGJ1dCB0aGUgZmlyc3QgZW50cnkgb2YgdGhlIGFycmF5LiBBbGlhc2VkIGFzIGB0YWlsYCBhbmQgYGRyb3BgLlxuICAvLyBFc3BlY2lhbGx5IHVzZWZ1bCBvbiB0aGUgYXJndW1lbnRzIG9iamVjdC4gUGFzc2luZyBhbiAqKm4qKiB3aWxsIHJldHVyblxuICAvLyB0aGUgcmVzdCBOIHZhbHVlcyBpbiB0aGUgYXJyYXkuIFRoZSAqKmd1YXJkKipcbiAgLy8gY2hlY2sgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgXy5tYXBgLlxuICBfLnJlc3QgPSBfLnRhaWwgPSBfLmRyb3AgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgbiA9PSBudWxsIHx8IGd1YXJkID8gMSA6IG4pO1xuICB9O1xuXG4gIC8vIFRyaW0gb3V0IGFsbCBmYWxzeSB2YWx1ZXMgZnJvbSBhbiBhcnJheS5cbiAgXy5jb21wYWN0ID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIoYXJyYXksIF8uaWRlbnRpdHkpO1xuICB9O1xuXG4gIC8vIEludGVybmFsIGltcGxlbWVudGF0aW9uIG9mIGEgcmVjdXJzaXZlIGBmbGF0dGVuYCBmdW5jdGlvbi5cbiAgdmFyIGZsYXR0ZW4gPSBmdW5jdGlvbihpbnB1dCwgc2hhbGxvdywgc3RyaWN0LCBvdXRwdXQpIHtcbiAgICBpZiAoc2hhbGxvdyAmJiBfLmV2ZXJ5KGlucHV0LCBfLmlzQXJyYXkpKSB7XG4gICAgICByZXR1cm4gY29uY2F0LmFwcGx5KG91dHB1dCwgaW5wdXQpO1xuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gaW5wdXQubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciB2YWx1ZSA9IGlucHV0W2ldO1xuICAgICAgaWYgKCFfLmlzQXJyYXkodmFsdWUpICYmICFfLmlzQXJndW1lbnRzKHZhbHVlKSkge1xuICAgICAgICBpZiAoIXN0cmljdCkgb3V0cHV0LnB1c2godmFsdWUpO1xuICAgICAgfSBlbHNlIGlmIChzaGFsbG93KSB7XG4gICAgICAgIHB1c2guYXBwbHkob3V0cHV0LCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmbGF0dGVuKHZhbHVlLCBzaGFsbG93LCBzdHJpY3QsIG91dHB1dCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXQ7XG4gIH07XG5cbiAgLy8gRmxhdHRlbiBvdXQgYW4gYXJyYXksIGVpdGhlciByZWN1cnNpdmVseSAoYnkgZGVmYXVsdCksIG9yIGp1c3Qgb25lIGxldmVsLlxuICBfLmZsYXR0ZW4gPSBmdW5jdGlvbihhcnJheSwgc2hhbGxvdykge1xuICAgIHJldHVybiBmbGF0dGVuKGFycmF5LCBzaGFsbG93LCBmYWxzZSwgW10pO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHZlcnNpb24gb2YgdGhlIGFycmF5IHRoYXQgZG9lcyBub3QgY29udGFpbiB0aGUgc3BlY2lmaWVkIHZhbHVlKHMpLlxuICBfLndpdGhvdXQgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHJldHVybiBfLmRpZmZlcmVuY2UoYXJyYXksIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gIH07XG5cbiAgLy8gUHJvZHVjZSBhIGR1cGxpY2F0ZS1mcmVlIHZlcnNpb24gb2YgdGhlIGFycmF5LiBJZiB0aGUgYXJyYXkgaGFzIGFscmVhZHlcbiAgLy8gYmVlbiBzb3J0ZWQsIHlvdSBoYXZlIHRoZSBvcHRpb24gb2YgdXNpbmcgYSBmYXN0ZXIgYWxnb3JpdGhtLlxuICAvLyBBbGlhc2VkIGFzIGB1bmlxdWVgLlxuICBfLnVuaXEgPSBfLnVuaXF1ZSA9IGZ1bmN0aW9uKGFycmF5LCBpc1NvcnRlZCwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIFtdO1xuICAgIGlmICghXy5pc0Jvb2xlYW4oaXNTb3J0ZWQpKSB7XG4gICAgICBjb250ZXh0ID0gaXRlcmF0ZWU7XG4gICAgICBpdGVyYXRlZSA9IGlzU29ydGVkO1xuICAgICAgaXNTb3J0ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGl0ZXJhdGVlICE9IG51bGwpIGl0ZXJhdGVlID0gXy5pdGVyYXRlZShpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciBzZWVuID0gW107XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgdmFsdWUgPSBhcnJheVtpXTtcbiAgICAgIGlmIChpc1NvcnRlZCkge1xuICAgICAgICBpZiAoIWkgfHwgc2VlbiAhPT0gdmFsdWUpIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICAgICAgc2VlbiA9IHZhbHVlO1xuICAgICAgfSBlbHNlIGlmIChpdGVyYXRlZSkge1xuICAgICAgICB2YXIgY29tcHV0ZWQgPSBpdGVyYXRlZSh2YWx1ZSwgaSwgYXJyYXkpO1xuICAgICAgICBpZiAoXy5pbmRleE9mKHNlZW4sIGNvbXB1dGVkKSA8IDApIHtcbiAgICAgICAgICBzZWVuLnB1c2goY29tcHV0ZWQpO1xuICAgICAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChfLmluZGV4T2YocmVzdWx0LCB2YWx1ZSkgPCAwKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBQcm9kdWNlIGFuIGFycmF5IHRoYXQgY29udGFpbnMgdGhlIHVuaW9uOiBlYWNoIGRpc3RpbmN0IGVsZW1lbnQgZnJvbSBhbGwgb2ZcbiAgLy8gdGhlIHBhc3NlZC1pbiBhcnJheXMuXG4gIF8udW5pb24gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gXy51bmlxKGZsYXR0ZW4oYXJndW1lbnRzLCB0cnVlLCB0cnVlLCBbXSkpO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYW4gYXJyYXkgdGhhdCBjb250YWlucyBldmVyeSBpdGVtIHNoYXJlZCBiZXR3ZWVuIGFsbCB0aGVcbiAgLy8gcGFzc2VkLWluIGFycmF5cy5cbiAgXy5pbnRlcnNlY3Rpb24gPSBmdW5jdGlvbihhcnJheSkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gW107XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciBhcmdzTGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gYXJyYXkubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBpdGVtID0gYXJyYXlbaV07XG4gICAgICBpZiAoXy5jb250YWlucyhyZXN1bHQsIGl0ZW0pKSBjb250aW51ZTtcbiAgICAgIGZvciAodmFyIGogPSAxOyBqIDwgYXJnc0xlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmICghXy5jb250YWlucyhhcmd1bWVudHNbal0sIGl0ZW0pKSBicmVhaztcbiAgICAgIH1cbiAgICAgIGlmIChqID09PSBhcmdzTGVuZ3RoKSByZXN1bHQucHVzaChpdGVtKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBUYWtlIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gb25lIGFycmF5IGFuZCBhIG51bWJlciBvZiBvdGhlciBhcnJheXMuXG4gIC8vIE9ubHkgdGhlIGVsZW1lbnRzIHByZXNlbnQgaW4ganVzdCB0aGUgZmlyc3QgYXJyYXkgd2lsbCByZW1haW4uXG4gIF8uZGlmZmVyZW5jZSA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIHJlc3QgPSBmbGF0dGVuKHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSwgdHJ1ZSwgdHJ1ZSwgW10pO1xuICAgIHJldHVybiBfLmZpbHRlcihhcnJheSwgZnVuY3Rpb24odmFsdWUpe1xuICAgICAgcmV0dXJuICFfLmNvbnRhaW5zKHJlc3QsIHZhbHVlKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBaaXAgdG9nZXRoZXIgbXVsdGlwbGUgbGlzdHMgaW50byBhIHNpbmdsZSBhcnJheSAtLSBlbGVtZW50cyB0aGF0IHNoYXJlXG4gIC8vIGFuIGluZGV4IGdvIHRvZ2V0aGVyLlxuICBfLnppcCA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiBbXTtcbiAgICB2YXIgbGVuZ3RoID0gXy5tYXgoYXJndW1lbnRzLCAnbGVuZ3RoJykubGVuZ3RoO1xuICAgIHZhciByZXN1bHRzID0gQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICByZXN1bHRzW2ldID0gXy5wbHVjayhhcmd1bWVudHMsIGkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBDb252ZXJ0cyBsaXN0cyBpbnRvIG9iamVjdHMuIFBhc3MgZWl0aGVyIGEgc2luZ2xlIGFycmF5IG9mIGBba2V5LCB2YWx1ZV1gXG4gIC8vIHBhaXJzLCBvciB0d28gcGFyYWxsZWwgYXJyYXlzIG9mIHRoZSBzYW1lIGxlbmd0aCAtLSBvbmUgb2Yga2V5cywgYW5kIG9uZSBvZlxuICAvLyB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZXMuXG4gIF8ub2JqZWN0ID0gZnVuY3Rpb24obGlzdCwgdmFsdWVzKSB7XG4gICAgaWYgKGxpc3QgPT0gbnVsbCkgcmV0dXJuIHt9O1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gbGlzdC5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHZhbHVlcykge1xuICAgICAgICByZXN1bHRbbGlzdFtpXV0gPSB2YWx1ZXNbaV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHRbbGlzdFtpXVswXV0gPSBsaXN0W2ldWzFdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgcG9zaXRpb24gb2YgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgYW4gaXRlbSBpbiBhbiBhcnJheSxcbiAgLy8gb3IgLTEgaWYgdGhlIGl0ZW0gaXMgbm90IGluY2x1ZGVkIGluIHRoZSBhcnJheS5cbiAgLy8gSWYgdGhlIGFycmF5IGlzIGxhcmdlIGFuZCBhbHJlYWR5IGluIHNvcnQgb3JkZXIsIHBhc3MgYHRydWVgXG4gIC8vIGZvciAqKmlzU29ydGVkKiogdG8gdXNlIGJpbmFyeSBzZWFyY2guXG4gIF8uaW5kZXhPZiA9IGZ1bmN0aW9uKGFycmF5LCBpdGVtLCBpc1NvcnRlZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gLTE7XG4gICAgdmFyIGkgPSAwLCBsZW5ndGggPSBhcnJheS5sZW5ndGg7XG4gICAgaWYgKGlzU29ydGVkKSB7XG4gICAgICBpZiAodHlwZW9mIGlzU29ydGVkID09ICdudW1iZXInKSB7XG4gICAgICAgIGkgPSBpc1NvcnRlZCA8IDAgPyBNYXRoLm1heCgwLCBsZW5ndGggKyBpc1NvcnRlZCkgOiBpc1NvcnRlZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGkgPSBfLnNvcnRlZEluZGV4KGFycmF5LCBpdGVtKTtcbiAgICAgICAgcmV0dXJuIGFycmF5W2ldID09PSBpdGVtID8gaSA6IC0xO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKDsgaSA8IGxlbmd0aDsgaSsrKSBpZiAoYXJyYXlbaV0gPT09IGl0ZW0pIHJldHVybiBpO1xuICAgIHJldHVybiAtMTtcbiAgfTtcblxuICBfLmxhc3RJbmRleE9mID0gZnVuY3Rpb24oYXJyYXksIGl0ZW0sIGZyb20pIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIC0xO1xuICAgIHZhciBpZHggPSBhcnJheS5sZW5ndGg7XG4gICAgaWYgKHR5cGVvZiBmcm9tID09ICdudW1iZXInKSB7XG4gICAgICBpZHggPSBmcm9tIDwgMCA/IGlkeCArIGZyb20gKyAxIDogTWF0aC5taW4oaWR4LCBmcm9tICsgMSk7XG4gICAgfVxuICAgIHdoaWxlICgtLWlkeCA+PSAwKSBpZiAoYXJyYXlbaWR4XSA9PT0gaXRlbSkgcmV0dXJuIGlkeDtcbiAgICByZXR1cm4gLTE7XG4gIH07XG5cbiAgLy8gR2VuZXJhdGUgYW4gaW50ZWdlciBBcnJheSBjb250YWluaW5nIGFuIGFyaXRobWV0aWMgcHJvZ3Jlc3Npb24uIEEgcG9ydCBvZlxuICAvLyB0aGUgbmF0aXZlIFB5dGhvbiBgcmFuZ2UoKWAgZnVuY3Rpb24uIFNlZVxuICAvLyBbdGhlIFB5dGhvbiBkb2N1bWVudGF0aW9uXShodHRwOi8vZG9jcy5weXRob24ub3JnL2xpYnJhcnkvZnVuY3Rpb25zLmh0bWwjcmFuZ2UpLlxuICBfLnJhbmdlID0gZnVuY3Rpb24oc3RhcnQsIHN0b3AsIHN0ZXApIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8PSAxKSB7XG4gICAgICBzdG9wID0gc3RhcnQgfHwgMDtcbiAgICAgIHN0YXJ0ID0gMDtcbiAgICB9XG4gICAgc3RlcCA9IHN0ZXAgfHwgMTtcblxuICAgIHZhciBsZW5ndGggPSBNYXRoLm1heChNYXRoLmNlaWwoKHN0b3AgLSBzdGFydCkgLyBzdGVwKSwgMCk7XG4gICAgdmFyIHJhbmdlID0gQXJyYXkobGVuZ3RoKTtcblxuICAgIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGxlbmd0aDsgaWR4KyssIHN0YXJ0ICs9IHN0ZXApIHtcbiAgICAgIHJhbmdlW2lkeF0gPSBzdGFydDtcbiAgICB9XG5cbiAgICByZXR1cm4gcmFuZ2U7XG4gIH07XG5cbiAgLy8gRnVuY3Rpb24gKGFoZW0pIEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSZXVzYWJsZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgcHJvdG90eXBlIHNldHRpbmcuXG4gIHZhciBDdG9yID0gZnVuY3Rpb24oKXt9O1xuXG4gIC8vIENyZWF0ZSBhIGZ1bmN0aW9uIGJvdW5kIHRvIGEgZ2l2ZW4gb2JqZWN0IChhc3NpZ25pbmcgYHRoaXNgLCBhbmQgYXJndW1lbnRzLFxuICAvLyBvcHRpb25hbGx5KS4gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYEZ1bmN0aW9uLmJpbmRgIGlmXG4gIC8vIGF2YWlsYWJsZS5cbiAgXy5iaW5kID0gZnVuY3Rpb24oZnVuYywgY29udGV4dCkge1xuICAgIHZhciBhcmdzLCBib3VuZDtcbiAgICBpZiAobmF0aXZlQmluZCAmJiBmdW5jLmJpbmQgPT09IG5hdGl2ZUJpbmQpIHJldHVybiBuYXRpdmVCaW5kLmFwcGx5KGZ1bmMsIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgaWYgKCFfLmlzRnVuY3Rpb24oZnVuYykpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JpbmQgbXVzdCBiZSBjYWxsZWQgb24gYSBmdW5jdGlvbicpO1xuICAgIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgYm91bmQgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBib3VuZCkpIHJldHVybiBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgICAgQ3Rvci5wcm90b3R5cGUgPSBmdW5jLnByb3RvdHlwZTtcbiAgICAgIHZhciBzZWxmID0gbmV3IEN0b3I7XG4gICAgICBDdG9yLnByb3RvdHlwZSA9IG51bGw7XG4gICAgICB2YXIgcmVzdWx0ID0gZnVuYy5hcHBseShzZWxmLCBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICAgIGlmIChfLmlzT2JqZWN0KHJlc3VsdCkpIHJldHVybiByZXN1bHQ7XG4gICAgICByZXR1cm4gc2VsZjtcbiAgICB9O1xuICAgIHJldHVybiBib3VuZDtcbiAgfTtcblxuICAvLyBQYXJ0aWFsbHkgYXBwbHkgYSBmdW5jdGlvbiBieSBjcmVhdGluZyBhIHZlcnNpb24gdGhhdCBoYXMgaGFkIHNvbWUgb2YgaXRzXG4gIC8vIGFyZ3VtZW50cyBwcmUtZmlsbGVkLCB3aXRob3V0IGNoYW5naW5nIGl0cyBkeW5hbWljIGB0aGlzYCBjb250ZXh0LiBfIGFjdHNcbiAgLy8gYXMgYSBwbGFjZWhvbGRlciwgYWxsb3dpbmcgYW55IGNvbWJpbmF0aW9uIG9mIGFyZ3VtZW50cyB0byBiZSBwcmUtZmlsbGVkLlxuICBfLnBhcnRpYWwgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgdmFyIGJvdW5kQXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcG9zaXRpb24gPSAwO1xuICAgICAgdmFyIGFyZ3MgPSBib3VuZEFyZ3Muc2xpY2UoKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBhcmdzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChhcmdzW2ldID09PSBfKSBhcmdzW2ldID0gYXJndW1lbnRzW3Bvc2l0aW9uKytdO1xuICAgICAgfVxuICAgICAgd2hpbGUgKHBvc2l0aW9uIDwgYXJndW1lbnRzLmxlbmd0aCkgYXJncy5wdXNoKGFyZ3VtZW50c1twb3NpdGlvbisrXSk7XG4gICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIEJpbmQgYSBudW1iZXIgb2YgYW4gb2JqZWN0J3MgbWV0aG9kcyB0byB0aGF0IG9iamVjdC4gUmVtYWluaW5nIGFyZ3VtZW50c1xuICAvLyBhcmUgdGhlIG1ldGhvZCBuYW1lcyB0byBiZSBib3VuZC4gVXNlZnVsIGZvciBlbnN1cmluZyB0aGF0IGFsbCBjYWxsYmFja3NcbiAgLy8gZGVmaW5lZCBvbiBhbiBvYmplY3QgYmVsb25nIHRvIGl0LlxuICBfLmJpbmRBbGwgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgaSwgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCwga2V5O1xuICAgIGlmIChsZW5ndGggPD0gMSkgdGhyb3cgbmV3IEVycm9yKCdiaW5kQWxsIG11c3QgYmUgcGFzc2VkIGZ1bmN0aW9uIG5hbWVzJyk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBrZXkgPSBhcmd1bWVudHNbaV07XG4gICAgICBvYmpba2V5XSA9IF8uYmluZChvYmpba2V5XSwgb2JqKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBNZW1vaXplIGFuIGV4cGVuc2l2ZSBmdW5jdGlvbiBieSBzdG9yaW5nIGl0cyByZXN1bHRzLlxuICBfLm1lbW9pemUgPSBmdW5jdGlvbihmdW5jLCBoYXNoZXIpIHtcbiAgICB2YXIgbWVtb2l6ZSA9IGZ1bmN0aW9uKGtleSkge1xuICAgICAgdmFyIGNhY2hlID0gbWVtb2l6ZS5jYWNoZTtcbiAgICAgIHZhciBhZGRyZXNzID0gaGFzaGVyID8gaGFzaGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgOiBrZXk7XG4gICAgICBpZiAoIV8uaGFzKGNhY2hlLCBhZGRyZXNzKSkgY2FjaGVbYWRkcmVzc10gPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICByZXR1cm4gY2FjaGVbYWRkcmVzc107XG4gICAgfTtcbiAgICBtZW1vaXplLmNhY2hlID0ge307XG4gICAgcmV0dXJuIG1lbW9pemU7XG4gIH07XG5cbiAgLy8gRGVsYXlzIGEgZnVuY3Rpb24gZm9yIHRoZSBnaXZlbiBudW1iZXIgb2YgbWlsbGlzZWNvbmRzLCBhbmQgdGhlbiBjYWxsc1xuICAvLyBpdCB3aXRoIHRoZSBhcmd1bWVudHMgc3VwcGxpZWQuXG4gIF8uZGVsYXkgPSBmdW5jdGlvbihmdW5jLCB3YWl0KSB7XG4gICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBmdW5jLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgIH0sIHdhaXQpO1xuICB9O1xuXG4gIC8vIERlZmVycyBhIGZ1bmN0aW9uLCBzY2hlZHVsaW5nIGl0IHRvIHJ1biBhZnRlciB0aGUgY3VycmVudCBjYWxsIHN0YWNrIGhhc1xuICAvLyBjbGVhcmVkLlxuICBfLmRlZmVyID0gZnVuY3Rpb24oZnVuYykge1xuICAgIHJldHVybiBfLmRlbGF5LmFwcGx5KF8sIFtmdW5jLCAxXS5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKSk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uLCB0aGF0LCB3aGVuIGludm9rZWQsIHdpbGwgb25seSBiZSB0cmlnZ2VyZWQgYXQgbW9zdCBvbmNlXG4gIC8vIGR1cmluZyBhIGdpdmVuIHdpbmRvdyBvZiB0aW1lLiBOb3JtYWxseSwgdGhlIHRocm90dGxlZCBmdW5jdGlvbiB3aWxsIHJ1blxuICAvLyBhcyBtdWNoIGFzIGl0IGNhbiwgd2l0aG91dCBldmVyIGdvaW5nIG1vcmUgdGhhbiBvbmNlIHBlciBgd2FpdGAgZHVyYXRpb247XG4gIC8vIGJ1dCBpZiB5b3UnZCBsaWtlIHRvIGRpc2FibGUgdGhlIGV4ZWN1dGlvbiBvbiB0aGUgbGVhZGluZyBlZGdlLCBwYXNzXG4gIC8vIGB7bGVhZGluZzogZmFsc2V9YC4gVG8gZGlzYWJsZSBleGVjdXRpb24gb24gdGhlIHRyYWlsaW5nIGVkZ2UsIGRpdHRvLlxuICBfLnRocm90dGxlID0gZnVuY3Rpb24oZnVuYywgd2FpdCwgb3B0aW9ucykge1xuICAgIHZhciBjb250ZXh0LCBhcmdzLCByZXN1bHQ7XG4gICAgdmFyIHRpbWVvdXQgPSBudWxsO1xuICAgIHZhciBwcmV2aW91cyA9IDA7XG4gICAgaWYgKCFvcHRpb25zKSBvcHRpb25zID0ge307XG4gICAgdmFyIGxhdGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICBwcmV2aW91cyA9IG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UgPyAwIDogXy5ub3coKTtcbiAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgIGlmICghdGltZW91dCkgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgIH07XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG5vdyA9IF8ubm93KCk7XG4gICAgICBpZiAoIXByZXZpb3VzICYmIG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UpIHByZXZpb3VzID0gbm93O1xuICAgICAgdmFyIHJlbWFpbmluZyA9IHdhaXQgLSAobm93IC0gcHJldmlvdXMpO1xuICAgICAgY29udGV4dCA9IHRoaXM7XG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IHdhaXQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgcHJldmlvdXMgPSBub3c7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIGlmICghdGltZW91dCkgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgfSBlbHNlIGlmICghdGltZW91dCAmJiBvcHRpb25zLnRyYWlsaW5nICE9PSBmYWxzZSkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgcmVtYWluaW5nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIGFzIGxvbmcgYXMgaXQgY29udGludWVzIHRvIGJlIGludm9rZWQsIHdpbGwgbm90XG4gIC8vIGJlIHRyaWdnZXJlZC4gVGhlIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIGFmdGVyIGl0IHN0b3BzIGJlaW5nIGNhbGxlZCBmb3JcbiAgLy8gTiBtaWxsaXNlY29uZHMuIElmIGBpbW1lZGlhdGVgIGlzIHBhc3NlZCwgdHJpZ2dlciB0aGUgZnVuY3Rpb24gb24gdGhlXG4gIC8vIGxlYWRpbmcgZWRnZSwgaW5zdGVhZCBvZiB0aGUgdHJhaWxpbmcuXG4gIF8uZGVib3VuY2UgPSBmdW5jdGlvbihmdW5jLCB3YWl0LCBpbW1lZGlhdGUpIHtcbiAgICB2YXIgdGltZW91dCwgYXJncywgY29udGV4dCwgdGltZXN0YW1wLCByZXN1bHQ7XG5cbiAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBsYXN0ID0gXy5ub3coKSAtIHRpbWVzdGFtcDtcblxuICAgICAgaWYgKGxhc3QgPCB3YWl0ICYmIGxhc3QgPiAwKSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0IC0gbGFzdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgaWYgKCFpbW1lZGlhdGUpIHtcbiAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICAgIGlmICghdGltZW91dCkgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnRleHQgPSB0aGlzO1xuICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIHRpbWVzdGFtcCA9IF8ubm93KCk7XG4gICAgICB2YXIgY2FsbE5vdyA9IGltbWVkaWF0ZSAmJiAhdGltZW91dDtcbiAgICAgIGlmICghdGltZW91dCkgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQpO1xuICAgICAgaWYgKGNhbGxOb3cpIHtcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyB0aGUgZmlyc3QgZnVuY3Rpb24gcGFzc2VkIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSBzZWNvbmQsXG4gIC8vIGFsbG93aW5nIHlvdSB0byBhZGp1c3QgYXJndW1lbnRzLCBydW4gY29kZSBiZWZvcmUgYW5kIGFmdGVyLCBhbmRcbiAgLy8gY29uZGl0aW9uYWxseSBleGVjdXRlIHRoZSBvcmlnaW5hbCBmdW5jdGlvbi5cbiAgXy53cmFwID0gZnVuY3Rpb24oZnVuYywgd3JhcHBlcikge1xuICAgIHJldHVybiBfLnBhcnRpYWwod3JhcHBlciwgZnVuYyk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIG5lZ2F0ZWQgdmVyc2lvbiBvZiB0aGUgcGFzc2VkLWluIHByZWRpY2F0ZS5cbiAgXy5uZWdhdGUgPSBmdW5jdGlvbihwcmVkaWNhdGUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gIXByZWRpY2F0ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgaXMgdGhlIGNvbXBvc2l0aW9uIG9mIGEgbGlzdCBvZiBmdW5jdGlvbnMsIGVhY2hcbiAgLy8gY29uc3VtaW5nIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZ1bmN0aW9uIHRoYXQgZm9sbG93cy5cbiAgXy5jb21wb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgdmFyIHN0YXJ0ID0gYXJncy5sZW5ndGggLSAxO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBpID0gc3RhcnQ7XG4gICAgICB2YXIgcmVzdWx0ID0gYXJnc1tzdGFydF0uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIHdoaWxlIChpLS0pIHJlc3VsdCA9IGFyZ3NbaV0uY2FsbCh0aGlzLCByZXN1bHQpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgb25seSBiZSBleGVjdXRlZCBhZnRlciBiZWluZyBjYWxsZWQgTiB0aW1lcy5cbiAgXy5hZnRlciA9IGZ1bmN0aW9uKHRpbWVzLCBmdW5jKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKC0tdGltZXMgPCAxKSB7XG4gICAgICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIG9ubHkgYmUgZXhlY3V0ZWQgYmVmb3JlIGJlaW5nIGNhbGxlZCBOIHRpbWVzLlxuICBfLmJlZm9yZSA9IGZ1bmN0aW9uKHRpbWVzLCBmdW5jKSB7XG4gICAgdmFyIG1lbW87XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKC0tdGltZXMgPiAwKSB7XG4gICAgICAgIG1lbW8gPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmdW5jID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtZW1vO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBhdCBtb3N0IG9uZSB0aW1lLCBubyBtYXR0ZXIgaG93XG4gIC8vIG9mdGVuIHlvdSBjYWxsIGl0LiBVc2VmdWwgZm9yIGxhenkgaW5pdGlhbGl6YXRpb24uXG4gIF8ub25jZSA9IF8ucGFydGlhbChfLmJlZm9yZSwgMik7XG5cbiAgLy8gT2JqZWN0IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUmV0cmlldmUgdGhlIG5hbWVzIG9mIGFuIG9iamVjdCdzIHByb3BlcnRpZXMuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBPYmplY3Qua2V5c2BcbiAgXy5rZXlzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFfLmlzT2JqZWN0KG9iaikpIHJldHVybiBbXTtcbiAgICBpZiAobmF0aXZlS2V5cykgcmV0dXJuIG5hdGl2ZUtleXMob2JqKTtcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIGlmIChfLmhhcyhvYmosIGtleSkpIGtleXMucHVzaChrZXkpO1xuICAgIHJldHVybiBrZXlzO1xuICB9O1xuXG4gIC8vIFJldHJpZXZlIHRoZSB2YWx1ZXMgb2YgYW4gb2JqZWN0J3MgcHJvcGVydGllcy5cbiAgXy52YWx1ZXMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgdmFsdWVzID0gQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YWx1ZXNbaV0gPSBvYmpba2V5c1tpXV07XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZXM7XG4gIH07XG5cbiAgLy8gQ29udmVydCBhbiBvYmplY3QgaW50byBhIGxpc3Qgb2YgYFtrZXksIHZhbHVlXWAgcGFpcnMuXG4gIF8ucGFpcnMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgcGFpcnMgPSBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHBhaXJzW2ldID0gW2tleXNbaV0sIG9ialtrZXlzW2ldXV07XG4gICAgfVxuICAgIHJldHVybiBwYWlycztcbiAgfTtcblxuICAvLyBJbnZlcnQgdGhlIGtleXMgYW5kIHZhbHVlcyBvZiBhbiBvYmplY3QuIFRoZSB2YWx1ZXMgbXVzdCBiZSBzZXJpYWxpemFibGUuXG4gIF8uaW52ZXJ0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGtleXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHJlc3VsdFtvYmpba2V5c1tpXV1dID0ga2V5c1tpXTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSBzb3J0ZWQgbGlzdCBvZiB0aGUgZnVuY3Rpb24gbmFtZXMgYXZhaWxhYmxlIG9uIHRoZSBvYmplY3QuXG4gIC8vIEFsaWFzZWQgYXMgYG1ldGhvZHNgXG4gIF8uZnVuY3Rpb25zID0gXy5tZXRob2RzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIG5hbWVzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgaWYgKF8uaXNGdW5jdGlvbihvYmpba2V5XSkpIG5hbWVzLnB1c2goa2V5KTtcbiAgICB9XG4gICAgcmV0dXJuIG5hbWVzLnNvcnQoKTtcbiAgfTtcblxuICAvLyBFeHRlbmQgYSBnaXZlbiBvYmplY3Qgd2l0aCBhbGwgdGhlIHByb3BlcnRpZXMgaW4gcGFzc2VkLWluIG9iamVjdChzKS5cbiAgXy5leHRlbmQgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIG9iajtcbiAgICB2YXIgc291cmNlLCBwcm9wO1xuICAgIGZvciAodmFyIGkgPSAxLCBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgIGZvciAocHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgICAgaWYgKGhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBwcm9wKSkge1xuICAgICAgICAgICAgb2JqW3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgY29weSBvZiB0aGUgb2JqZWN0IG9ubHkgY29udGFpbmluZyB0aGUgd2hpdGVsaXN0ZWQgcHJvcGVydGllcy5cbiAgXy5waWNrID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHQgPSB7fSwga2V5O1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdDtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGl0ZXJhdGVlKSkge1xuICAgICAgaXRlcmF0ZWUgPSBjcmVhdGVDYWxsYmFjayhpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICAgICAgdmFyIHZhbHVlID0gb2JqW2tleV07XG4gICAgICAgIGlmIChpdGVyYXRlZSh2YWx1ZSwga2V5LCBvYmopKSByZXN1bHRba2V5XSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIga2V5cyA9IGNvbmNhdC5hcHBseShbXSwgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICAgIG9iaiA9IG5ldyBPYmplY3Qob2JqKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGtleSA9IGtleXNbaV07XG4gICAgICAgIGlmIChrZXkgaW4gb2JqKSByZXN1bHRba2V5XSA9IG9ialtrZXldO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gICAvLyBSZXR1cm4gYSBjb3B5IG9mIHRoZSBvYmplY3Qgd2l0aG91dCB0aGUgYmxhY2tsaXN0ZWQgcHJvcGVydGllcy5cbiAgXy5vbWl0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgIGlmIChfLmlzRnVuY3Rpb24oaXRlcmF0ZWUpKSB7XG4gICAgICBpdGVyYXRlZSA9IF8ubmVnYXRlKGl0ZXJhdGVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGtleXMgPSBfLm1hcChjb25jYXQuYXBwbHkoW10sIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSksIFN0cmluZyk7XG4gICAgICBpdGVyYXRlZSA9IGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgcmV0dXJuICFfLmNvbnRhaW5zKGtleXMsIGtleSk7XG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gXy5waWNrKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpO1xuICB9O1xuXG4gIC8vIEZpbGwgaW4gYSBnaXZlbiBvYmplY3Qgd2l0aCBkZWZhdWx0IHByb3BlcnRpZXMuXG4gIF8uZGVmYXVsdHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIG9iajtcbiAgICBmb3IgKHZhciBpID0gMSwgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldO1xuICAgICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgICAgaWYgKG9ialtwcm9wXSA9PT0gdm9pZCAwKSBvYmpbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gQ3JlYXRlIGEgKHNoYWxsb3ctY2xvbmVkKSBkdXBsaWNhdGUgb2YgYW4gb2JqZWN0LlxuICBfLmNsb25lID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFfLmlzT2JqZWN0KG9iaikpIHJldHVybiBvYmo7XG4gICAgcmV0dXJuIF8uaXNBcnJheShvYmopID8gb2JqLnNsaWNlKCkgOiBfLmV4dGVuZCh7fSwgb2JqKTtcbiAgfTtcblxuICAvLyBJbnZva2VzIGludGVyY2VwdG9yIHdpdGggdGhlIG9iaiwgYW5kIHRoZW4gcmV0dXJucyBvYmouXG4gIC8vIFRoZSBwcmltYXJ5IHB1cnBvc2Ugb2YgdGhpcyBtZXRob2QgaXMgdG8gXCJ0YXAgaW50b1wiIGEgbWV0aG9kIGNoYWluLCBpblxuICAvLyBvcmRlciB0byBwZXJmb3JtIG9wZXJhdGlvbnMgb24gaW50ZXJtZWRpYXRlIHJlc3VsdHMgd2l0aGluIHRoZSBjaGFpbi5cbiAgXy50YXAgPSBmdW5jdGlvbihvYmosIGludGVyY2VwdG9yKSB7XG4gICAgaW50ZXJjZXB0b3Iob2JqKTtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIEludGVybmFsIHJlY3Vyc2l2ZSBjb21wYXJpc29uIGZ1bmN0aW9uIGZvciBgaXNFcXVhbGAuXG4gIHZhciBlcSA9IGZ1bmN0aW9uKGEsIGIsIGFTdGFjaywgYlN0YWNrKSB7XG4gICAgLy8gSWRlbnRpY2FsIG9iamVjdHMgYXJlIGVxdWFsLiBgMCA9PT0gLTBgLCBidXQgdGhleSBhcmVuJ3QgaWRlbnRpY2FsLlxuICAgIC8vIFNlZSB0aGUgW0hhcm1vbnkgYGVnYWxgIHByb3Bvc2FsXShodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OmVnYWwpLlxuICAgIGlmIChhID09PSBiKSByZXR1cm4gYSAhPT0gMCB8fCAxIC8gYSA9PT0gMSAvIGI7XG4gICAgLy8gQSBzdHJpY3QgY29tcGFyaXNvbiBpcyBuZWNlc3NhcnkgYmVjYXVzZSBgbnVsbCA9PSB1bmRlZmluZWRgLlxuICAgIGlmIChhID09IG51bGwgfHwgYiA9PSBudWxsKSByZXR1cm4gYSA9PT0gYjtcbiAgICAvLyBVbndyYXAgYW55IHdyYXBwZWQgb2JqZWN0cy5cbiAgICBpZiAoYSBpbnN0YW5jZW9mIF8pIGEgPSBhLl93cmFwcGVkO1xuICAgIGlmIChiIGluc3RhbmNlb2YgXykgYiA9IGIuX3dyYXBwZWQ7XG4gICAgLy8gQ29tcGFyZSBgW1tDbGFzc11dYCBuYW1lcy5cbiAgICB2YXIgY2xhc3NOYW1lID0gdG9TdHJpbmcuY2FsbChhKTtcbiAgICBpZiAoY2xhc3NOYW1lICE9PSB0b1N0cmluZy5jYWxsKGIpKSByZXR1cm4gZmFsc2U7XG4gICAgc3dpdGNoIChjbGFzc05hbWUpIHtcbiAgICAgIC8vIFN0cmluZ3MsIG51bWJlcnMsIHJlZ3VsYXIgZXhwcmVzc2lvbnMsIGRhdGVzLCBhbmQgYm9vbGVhbnMgYXJlIGNvbXBhcmVkIGJ5IHZhbHVlLlxuICAgICAgY2FzZSAnW29iamVjdCBSZWdFeHBdJzpcbiAgICAgIC8vIFJlZ0V4cHMgYXJlIGNvZXJjZWQgdG8gc3RyaW5ncyBmb3IgY29tcGFyaXNvbiAoTm90ZTogJycgKyAvYS9pID09PSAnL2EvaScpXG4gICAgICBjYXNlICdbb2JqZWN0IFN0cmluZ10nOlxuICAgICAgICAvLyBQcmltaXRpdmVzIGFuZCB0aGVpciBjb3JyZXNwb25kaW5nIG9iamVjdCB3cmFwcGVycyBhcmUgZXF1aXZhbGVudDsgdGh1cywgYFwiNVwiYCBpc1xuICAgICAgICAvLyBlcXVpdmFsZW50IHRvIGBuZXcgU3RyaW5nKFwiNVwiKWAuXG4gICAgICAgIHJldHVybiAnJyArIGEgPT09ICcnICsgYjtcbiAgICAgIGNhc2UgJ1tvYmplY3QgTnVtYmVyXSc6XG4gICAgICAgIC8vIGBOYU5gcyBhcmUgZXF1aXZhbGVudCwgYnV0IG5vbi1yZWZsZXhpdmUuXG4gICAgICAgIC8vIE9iamVjdChOYU4pIGlzIGVxdWl2YWxlbnQgdG8gTmFOXG4gICAgICAgIGlmICgrYSAhPT0gK2EpIHJldHVybiArYiAhPT0gK2I7XG4gICAgICAgIC8vIEFuIGBlZ2FsYCBjb21wYXJpc29uIGlzIHBlcmZvcm1lZCBmb3Igb3RoZXIgbnVtZXJpYyB2YWx1ZXMuXG4gICAgICAgIHJldHVybiArYSA9PT0gMCA/IDEgLyArYSA9PT0gMSAvIGIgOiArYSA9PT0gK2I7XG4gICAgICBjYXNlICdbb2JqZWN0IERhdGVdJzpcbiAgICAgIGNhc2UgJ1tvYmplY3QgQm9vbGVhbl0nOlxuICAgICAgICAvLyBDb2VyY2UgZGF0ZXMgYW5kIGJvb2xlYW5zIHRvIG51bWVyaWMgcHJpbWl0aXZlIHZhbHVlcy4gRGF0ZXMgYXJlIGNvbXBhcmVkIGJ5IHRoZWlyXG4gICAgICAgIC8vIG1pbGxpc2Vjb25kIHJlcHJlc2VudGF0aW9ucy4gTm90ZSB0aGF0IGludmFsaWQgZGF0ZXMgd2l0aCBtaWxsaXNlY29uZCByZXByZXNlbnRhdGlvbnNcbiAgICAgICAgLy8gb2YgYE5hTmAgYXJlIG5vdCBlcXVpdmFsZW50LlxuICAgICAgICByZXR1cm4gK2EgPT09ICtiO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGEgIT0gJ29iamVjdCcgfHwgdHlwZW9mIGIgIT0gJ29iamVjdCcpIHJldHVybiBmYWxzZTtcbiAgICAvLyBBc3N1bWUgZXF1YWxpdHkgZm9yIGN5Y2xpYyBzdHJ1Y3R1cmVzLiBUaGUgYWxnb3JpdGhtIGZvciBkZXRlY3RpbmcgY3ljbGljXG4gICAgLy8gc3RydWN0dXJlcyBpcyBhZGFwdGVkIGZyb20gRVMgNS4xIHNlY3Rpb24gMTUuMTIuMywgYWJzdHJhY3Qgb3BlcmF0aW9uIGBKT2AuXG4gICAgdmFyIGxlbmd0aCA9IGFTdGFjay5sZW5ndGg7XG4gICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICAvLyBMaW5lYXIgc2VhcmNoLiBQZXJmb3JtYW5jZSBpcyBpbnZlcnNlbHkgcHJvcG9ydGlvbmFsIHRvIHRoZSBudW1iZXIgb2ZcbiAgICAgIC8vIHVuaXF1ZSBuZXN0ZWQgc3RydWN0dXJlcy5cbiAgICAgIGlmIChhU3RhY2tbbGVuZ3RoXSA9PT0gYSkgcmV0dXJuIGJTdGFja1tsZW5ndGhdID09PSBiO1xuICAgIH1cbiAgICAvLyBPYmplY3RzIHdpdGggZGlmZmVyZW50IGNvbnN0cnVjdG9ycyBhcmUgbm90IGVxdWl2YWxlbnQsIGJ1dCBgT2JqZWN0YHNcbiAgICAvLyBmcm9tIGRpZmZlcmVudCBmcmFtZXMgYXJlLlxuICAgIHZhciBhQ3RvciA9IGEuY29uc3RydWN0b3IsIGJDdG9yID0gYi5jb25zdHJ1Y3RvcjtcbiAgICBpZiAoXG4gICAgICBhQ3RvciAhPT0gYkN0b3IgJiZcbiAgICAgIC8vIEhhbmRsZSBPYmplY3QuY3JlYXRlKHgpIGNhc2VzXG4gICAgICAnY29uc3RydWN0b3InIGluIGEgJiYgJ2NvbnN0cnVjdG9yJyBpbiBiICYmXG4gICAgICAhKF8uaXNGdW5jdGlvbihhQ3RvcikgJiYgYUN0b3IgaW5zdGFuY2VvZiBhQ3RvciAmJlxuICAgICAgICBfLmlzRnVuY3Rpb24oYkN0b3IpICYmIGJDdG9yIGluc3RhbmNlb2YgYkN0b3IpXG4gICAgKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEFkZCB0aGUgZmlyc3Qgb2JqZWN0IHRvIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICBhU3RhY2sucHVzaChhKTtcbiAgICBiU3RhY2sucHVzaChiKTtcbiAgICB2YXIgc2l6ZSwgcmVzdWx0O1xuICAgIC8vIFJlY3Vyc2l2ZWx5IGNvbXBhcmUgb2JqZWN0cyBhbmQgYXJyYXlzLlxuICAgIGlmIChjbGFzc05hbWUgPT09ICdbb2JqZWN0IEFycmF5XScpIHtcbiAgICAgIC8vIENvbXBhcmUgYXJyYXkgbGVuZ3RocyB0byBkZXRlcm1pbmUgaWYgYSBkZWVwIGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5LlxuICAgICAgc2l6ZSA9IGEubGVuZ3RoO1xuICAgICAgcmVzdWx0ID0gc2l6ZSA9PT0gYi5sZW5ndGg7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIC8vIERlZXAgY29tcGFyZSB0aGUgY29udGVudHMsIGlnbm9yaW5nIG5vbi1udW1lcmljIHByb3BlcnRpZXMuXG4gICAgICAgIHdoaWxlIChzaXplLS0pIHtcbiAgICAgICAgICBpZiAoIShyZXN1bHQgPSBlcShhW3NpemVdLCBiW3NpemVdLCBhU3RhY2ssIGJTdGFjaykpKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBEZWVwIGNvbXBhcmUgb2JqZWN0cy5cbiAgICAgIHZhciBrZXlzID0gXy5rZXlzKGEpLCBrZXk7XG4gICAgICBzaXplID0ga2V5cy5sZW5ndGg7XG4gICAgICAvLyBFbnN1cmUgdGhhdCBib3RoIG9iamVjdHMgY29udGFpbiB0aGUgc2FtZSBudW1iZXIgb2YgcHJvcGVydGllcyBiZWZvcmUgY29tcGFyaW5nIGRlZXAgZXF1YWxpdHkuXG4gICAgICByZXN1bHQgPSBfLmtleXMoYikubGVuZ3RoID09PSBzaXplO1xuICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICB3aGlsZSAoc2l6ZS0tKSB7XG4gICAgICAgICAgLy8gRGVlcCBjb21wYXJlIGVhY2ggbWVtYmVyXG4gICAgICAgICAga2V5ID0ga2V5c1tzaXplXTtcbiAgICAgICAgICBpZiAoIShyZXN1bHQgPSBfLmhhcyhiLCBrZXkpICYmIGVxKGFba2V5XSwgYltrZXldLCBhU3RhY2ssIGJTdGFjaykpKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBSZW1vdmUgdGhlIGZpcnN0IG9iamVjdCBmcm9tIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICBhU3RhY2sucG9wKCk7XG4gICAgYlN0YWNrLnBvcCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUGVyZm9ybSBhIGRlZXAgY29tcGFyaXNvbiB0byBjaGVjayBpZiB0d28gb2JqZWN0cyBhcmUgZXF1YWwuXG4gIF8uaXNFcXVhbCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gZXEoYSwgYiwgW10sIFtdKTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIGFycmF5LCBzdHJpbmcsIG9yIG9iamVjdCBlbXB0eT9cbiAgLy8gQW4gXCJlbXB0eVwiIG9iamVjdCBoYXMgbm8gZW51bWVyYWJsZSBvd24tcHJvcGVydGllcy5cbiAgXy5pc0VtcHR5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoXy5pc0FycmF5KG9iaikgfHwgXy5pc1N0cmluZyhvYmopIHx8IF8uaXNBcmd1bWVudHMob2JqKSkgcmV0dXJuIG9iai5sZW5ndGggPT09IDA7XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKF8uaGFzKG9iaiwga2V5KSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYSBET00gZWxlbWVudD9cbiAgXy5pc0VsZW1lbnQgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gISEob2JqICYmIG9iai5ub2RlVHlwZSA9PT0gMSk7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhbiBhcnJheT9cbiAgLy8gRGVsZWdhdGVzIHRvIEVDTUE1J3MgbmF0aXZlIEFycmF5LmlzQXJyYXlcbiAgXy5pc0FycmF5ID0gbmF0aXZlSXNBcnJheSB8fCBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFyaWFibGUgYW4gb2JqZWN0P1xuICBfLmlzT2JqZWN0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIHR5cGUgPSB0eXBlb2Ygb2JqO1xuICAgIHJldHVybiB0eXBlID09PSAnZnVuY3Rpb24nIHx8IHR5cGUgPT09ICdvYmplY3QnICYmICEhb2JqO1xuICB9O1xuXG4gIC8vIEFkZCBzb21lIGlzVHlwZSBtZXRob2RzOiBpc0FyZ3VtZW50cywgaXNGdW5jdGlvbiwgaXNTdHJpbmcsIGlzTnVtYmVyLCBpc0RhdGUsIGlzUmVnRXhwLlxuICBfLmVhY2goWydBcmd1bWVudHMnLCAnRnVuY3Rpb24nLCAnU3RyaW5nJywgJ051bWJlcicsICdEYXRlJywgJ1JlZ0V4cCddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgX1snaXMnICsgbmFtZV0gPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0ICcgKyBuYW1lICsgJ10nO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIERlZmluZSBhIGZhbGxiYWNrIHZlcnNpb24gb2YgdGhlIG1ldGhvZCBpbiBicm93c2VycyAoYWhlbSwgSUUpLCB3aGVyZVxuICAvLyB0aGVyZSBpc24ndCBhbnkgaW5zcGVjdGFibGUgXCJBcmd1bWVudHNcIiB0eXBlLlxuICBpZiAoIV8uaXNBcmd1bWVudHMoYXJndW1lbnRzKSkge1xuICAgIF8uaXNBcmd1bWVudHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBfLmhhcyhvYmosICdjYWxsZWUnKTtcbiAgICB9O1xuICB9XG5cbiAgLy8gT3B0aW1pemUgYGlzRnVuY3Rpb25gIGlmIGFwcHJvcHJpYXRlLiBXb3JrIGFyb3VuZCBhbiBJRSAxMSBidWcuXG4gIGlmICh0eXBlb2YgLy4vICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgXy5pc0Z1bmN0aW9uID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gdHlwZW9mIG9iaiA9PSAnZnVuY3Rpb24nIHx8IGZhbHNlO1xuICAgIH07XG4gIH1cblxuICAvLyBJcyBhIGdpdmVuIG9iamVjdCBhIGZpbml0ZSBudW1iZXI/XG4gIF8uaXNGaW5pdGUgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gaXNGaW5pdGUob2JqKSAmJiAhaXNOYU4ocGFyc2VGbG9hdChvYmopKTtcbiAgfTtcblxuICAvLyBJcyB0aGUgZ2l2ZW4gdmFsdWUgYE5hTmA/IChOYU4gaXMgdGhlIG9ubHkgbnVtYmVyIHdoaWNoIGRvZXMgbm90IGVxdWFsIGl0c2VsZikuXG4gIF8uaXNOYU4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gXy5pc051bWJlcihvYmopICYmIG9iaiAhPT0gK29iajtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGEgYm9vbGVhbj9cbiAgXy5pc0Jvb2xlYW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB0cnVlIHx8IG9iaiA9PT0gZmFsc2UgfHwgdG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBCb29sZWFuXSc7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBlcXVhbCB0byBudWxsP1xuICBfLmlzTnVsbCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IG51bGw7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YXJpYWJsZSB1bmRlZmluZWQ/XG4gIF8uaXNVbmRlZmluZWQgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB2b2lkIDA7XG4gIH07XG5cbiAgLy8gU2hvcnRjdXQgZnVuY3Rpb24gZm9yIGNoZWNraW5nIGlmIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBwcm9wZXJ0eSBkaXJlY3RseVxuICAvLyBvbiBpdHNlbGYgKGluIG90aGVyIHdvcmRzLCBub3Qgb24gYSBwcm90b3R5cGUpLlxuICBfLmhhcyA9IGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gICAgcmV0dXJuIG9iaiAhPSBudWxsICYmIGhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpO1xuICB9O1xuXG4gIC8vIFV0aWxpdHkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUnVuIFVuZGVyc2NvcmUuanMgaW4gKm5vQ29uZmxpY3QqIG1vZGUsIHJldHVybmluZyB0aGUgYF9gIHZhcmlhYmxlIHRvIGl0c1xuICAvLyBwcmV2aW91cyBvd25lci4gUmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8ubm9Db25mbGljdCA9IGZ1bmN0aW9uKCkge1xuICAgIHJvb3QuXyA9IHByZXZpb3VzVW5kZXJzY29yZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvLyBLZWVwIHRoZSBpZGVudGl0eSBmdW5jdGlvbiBhcm91bmQgZm9yIGRlZmF1bHQgaXRlcmF0ZWVzLlxuICBfLmlkZW50aXR5ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG5cbiAgXy5jb25zdGFudCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH07XG4gIH07XG5cbiAgXy5ub29wID0gZnVuY3Rpb24oKXt9O1xuXG4gIF8ucHJvcGVydHkgPSBmdW5jdGlvbihrZXkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gb2JqW2tleV07XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgcHJlZGljYXRlIGZvciBjaGVja2luZyB3aGV0aGVyIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBzZXQgb2YgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8ubWF0Y2hlcyA9IGZ1bmN0aW9uKGF0dHJzKSB7XG4gICAgdmFyIHBhaXJzID0gXy5wYWlycyhhdHRycyksIGxlbmd0aCA9IHBhaXJzLmxlbmd0aDtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICBpZiAob2JqID09IG51bGwpIHJldHVybiAhbGVuZ3RoO1xuICAgICAgb2JqID0gbmV3IE9iamVjdChvYmopO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgcGFpciA9IHBhaXJzW2ldLCBrZXkgPSBwYWlyWzBdO1xuICAgICAgICBpZiAocGFpclsxXSAhPT0gb2JqW2tleV0gfHwgIShrZXkgaW4gb2JqKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSdW4gYSBmdW5jdGlvbiAqKm4qKiB0aW1lcy5cbiAgXy50aW1lcyA9IGZ1bmN0aW9uKG4sIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgdmFyIGFjY3VtID0gQXJyYXkoTWF0aC5tYXgoMCwgbikpO1xuICAgIGl0ZXJhdGVlID0gY3JlYXRlQ2FsbGJhY2soaXRlcmF0ZWUsIGNvbnRleHQsIDEpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSBhY2N1bVtpXSA9IGl0ZXJhdGVlKGkpO1xuICAgIHJldHVybiBhY2N1bTtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIG1pbiBhbmQgbWF4IChpbmNsdXNpdmUpLlxuICBfLnJhbmRvbSA9IGZ1bmN0aW9uKG1pbiwgbWF4KSB7XG4gICAgaWYgKG1heCA9PSBudWxsKSB7XG4gICAgICBtYXggPSBtaW47XG4gICAgICBtaW4gPSAwO1xuICAgIH1cbiAgICByZXR1cm4gbWluICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKTtcbiAgfTtcblxuICAvLyBBIChwb3NzaWJseSBmYXN0ZXIpIHdheSB0byBnZXQgdGhlIGN1cnJlbnQgdGltZXN0YW1wIGFzIGFuIGludGVnZXIuXG4gIF8ubm93ID0gRGF0ZS5ub3cgfHwgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICB9O1xuXG4gICAvLyBMaXN0IG9mIEhUTUwgZW50aXRpZXMgZm9yIGVzY2FwaW5nLlxuICB2YXIgZXNjYXBlTWFwID0ge1xuICAgICcmJzogJyZhbXA7JyxcbiAgICAnPCc6ICcmbHQ7JyxcbiAgICAnPic6ICcmZ3Q7JyxcbiAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICBcIidcIjogJyYjeDI3OycsXG4gICAgJ2AnOiAnJiN4NjA7J1xuICB9O1xuICB2YXIgdW5lc2NhcGVNYXAgPSBfLmludmVydChlc2NhcGVNYXApO1xuXG4gIC8vIEZ1bmN0aW9ucyBmb3IgZXNjYXBpbmcgYW5kIHVuZXNjYXBpbmcgc3RyaW5ncyB0by9mcm9tIEhUTUwgaW50ZXJwb2xhdGlvbi5cbiAgdmFyIGNyZWF0ZUVzY2FwZXIgPSBmdW5jdGlvbihtYXApIHtcbiAgICB2YXIgZXNjYXBlciA9IGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICByZXR1cm4gbWFwW21hdGNoXTtcbiAgICB9O1xuICAgIC8vIFJlZ2V4ZXMgZm9yIGlkZW50aWZ5aW5nIGEga2V5IHRoYXQgbmVlZHMgdG8gYmUgZXNjYXBlZFxuICAgIHZhciBzb3VyY2UgPSAnKD86JyArIF8ua2V5cyhtYXApLmpvaW4oJ3wnKSArICcpJztcbiAgICB2YXIgdGVzdFJlZ2V4cCA9IFJlZ0V4cChzb3VyY2UpO1xuICAgIHZhciByZXBsYWNlUmVnZXhwID0gUmVnRXhwKHNvdXJjZSwgJ2cnKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICBzdHJpbmcgPSBzdHJpbmcgPT0gbnVsbCA/ICcnIDogJycgKyBzdHJpbmc7XG4gICAgICByZXR1cm4gdGVzdFJlZ2V4cC50ZXN0KHN0cmluZykgPyBzdHJpbmcucmVwbGFjZShyZXBsYWNlUmVnZXhwLCBlc2NhcGVyKSA6IHN0cmluZztcbiAgICB9O1xuICB9O1xuICBfLmVzY2FwZSA9IGNyZWF0ZUVzY2FwZXIoZXNjYXBlTWFwKTtcbiAgXy51bmVzY2FwZSA9IGNyZWF0ZUVzY2FwZXIodW5lc2NhcGVNYXApO1xuXG4gIC8vIElmIHRoZSB2YWx1ZSBvZiB0aGUgbmFtZWQgYHByb3BlcnR5YCBpcyBhIGZ1bmN0aW9uIHRoZW4gaW52b2tlIGl0IHdpdGggdGhlXG4gIC8vIGBvYmplY3RgIGFzIGNvbnRleHQ7IG90aGVyd2lzZSwgcmV0dXJuIGl0LlxuICBfLnJlc3VsdCA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHtcbiAgICBpZiAob2JqZWN0ID09IG51bGwpIHJldHVybiB2b2lkIDA7XG4gICAgdmFyIHZhbHVlID0gb2JqZWN0W3Byb3BlcnR5XTtcbiAgICByZXR1cm4gXy5pc0Z1bmN0aW9uKHZhbHVlKSA/IG9iamVjdFtwcm9wZXJ0eV0oKSA6IHZhbHVlO1xuICB9O1xuXG4gIC8vIEdlbmVyYXRlIGEgdW5pcXVlIGludGVnZXIgaWQgKHVuaXF1ZSB3aXRoaW4gdGhlIGVudGlyZSBjbGllbnQgc2Vzc2lvbikuXG4gIC8vIFVzZWZ1bCBmb3IgdGVtcG9yYXJ5IERPTSBpZHMuXG4gIHZhciBpZENvdW50ZXIgPSAwO1xuICBfLnVuaXF1ZUlkID0gZnVuY3Rpb24ocHJlZml4KSB7XG4gICAgdmFyIGlkID0gKytpZENvdW50ZXIgKyAnJztcbiAgICByZXR1cm4gcHJlZml4ID8gcHJlZml4ICsgaWQgOiBpZDtcbiAgfTtcblxuICAvLyBCeSBkZWZhdWx0LCBVbmRlcnNjb3JlIHVzZXMgRVJCLXN0eWxlIHRlbXBsYXRlIGRlbGltaXRlcnMsIGNoYW5nZSB0aGVcbiAgLy8gZm9sbG93aW5nIHRlbXBsYXRlIHNldHRpbmdzIHRvIHVzZSBhbHRlcm5hdGl2ZSBkZWxpbWl0ZXJzLlxuICBfLnRlbXBsYXRlU2V0dGluZ3MgPSB7XG4gICAgZXZhbHVhdGUgICAgOiAvPCUoW1xcc1xcU10rPyklPi9nLFxuICAgIGludGVycG9sYXRlIDogLzwlPShbXFxzXFxTXSs/KSU+L2csXG4gICAgZXNjYXBlICAgICAgOiAvPCUtKFtcXHNcXFNdKz8pJT4vZ1xuICB9O1xuXG4gIC8vIFdoZW4gY3VzdG9taXppbmcgYHRlbXBsYXRlU2V0dGluZ3NgLCBpZiB5b3UgZG9uJ3Qgd2FudCB0byBkZWZpbmUgYW5cbiAgLy8gaW50ZXJwb2xhdGlvbiwgZXZhbHVhdGlvbiBvciBlc2NhcGluZyByZWdleCwgd2UgbmVlZCBvbmUgdGhhdCBpc1xuICAvLyBndWFyYW50ZWVkIG5vdCB0byBtYXRjaC5cbiAgdmFyIG5vTWF0Y2ggPSAvKC4pXi87XG5cbiAgLy8gQ2VydGFpbiBjaGFyYWN0ZXJzIG5lZWQgdG8gYmUgZXNjYXBlZCBzbyB0aGF0IHRoZXkgY2FuIGJlIHB1dCBpbnRvIGFcbiAgLy8gc3RyaW5nIGxpdGVyYWwuXG4gIHZhciBlc2NhcGVzID0ge1xuICAgIFwiJ1wiOiAgICAgIFwiJ1wiLFxuICAgICdcXFxcJzogICAgICdcXFxcJyxcbiAgICAnXFxyJzogICAgICdyJyxcbiAgICAnXFxuJzogICAgICduJyxcbiAgICAnXFx1MjAyOCc6ICd1MjAyOCcsXG4gICAgJ1xcdTIwMjknOiAndTIwMjknXG4gIH07XG5cbiAgdmFyIGVzY2FwZXIgPSAvXFxcXHwnfFxccnxcXG58XFx1MjAyOHxcXHUyMDI5L2c7XG5cbiAgdmFyIGVzY2FwZUNoYXIgPSBmdW5jdGlvbihtYXRjaCkge1xuICAgIHJldHVybiAnXFxcXCcgKyBlc2NhcGVzW21hdGNoXTtcbiAgfTtcblxuICAvLyBKYXZhU2NyaXB0IG1pY3JvLXRlbXBsYXRpbmcsIHNpbWlsYXIgdG8gSm9obiBSZXNpZydzIGltcGxlbWVudGF0aW9uLlxuICAvLyBVbmRlcnNjb3JlIHRlbXBsYXRpbmcgaGFuZGxlcyBhcmJpdHJhcnkgZGVsaW1pdGVycywgcHJlc2VydmVzIHdoaXRlc3BhY2UsXG4gIC8vIGFuZCBjb3JyZWN0bHkgZXNjYXBlcyBxdW90ZXMgd2l0aGluIGludGVycG9sYXRlZCBjb2RlLlxuICAvLyBOQjogYG9sZFNldHRpbmdzYCBvbmx5IGV4aXN0cyBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuXG4gIF8udGVtcGxhdGUgPSBmdW5jdGlvbih0ZXh0LCBzZXR0aW5ncywgb2xkU2V0dGluZ3MpIHtcbiAgICBpZiAoIXNldHRpbmdzICYmIG9sZFNldHRpbmdzKSBzZXR0aW5ncyA9IG9sZFNldHRpbmdzO1xuICAgIHNldHRpbmdzID0gXy5kZWZhdWx0cyh7fSwgc2V0dGluZ3MsIF8udGVtcGxhdGVTZXR0aW5ncyk7XG5cbiAgICAvLyBDb21iaW5lIGRlbGltaXRlcnMgaW50byBvbmUgcmVndWxhciBleHByZXNzaW9uIHZpYSBhbHRlcm5hdGlvbi5cbiAgICB2YXIgbWF0Y2hlciA9IFJlZ0V4cChbXG4gICAgICAoc2V0dGluZ3MuZXNjYXBlIHx8IG5vTWF0Y2gpLnNvdXJjZSxcbiAgICAgIChzZXR0aW5ncy5pbnRlcnBvbGF0ZSB8fCBub01hdGNoKS5zb3VyY2UsXG4gICAgICAoc2V0dGluZ3MuZXZhbHVhdGUgfHwgbm9NYXRjaCkuc291cmNlXG4gICAgXS5qb2luKCd8JykgKyAnfCQnLCAnZycpO1xuXG4gICAgLy8gQ29tcGlsZSB0aGUgdGVtcGxhdGUgc291cmNlLCBlc2NhcGluZyBzdHJpbmcgbGl0ZXJhbHMgYXBwcm9wcmlhdGVseS5cbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIHZhciBzb3VyY2UgPSBcIl9fcCs9J1wiO1xuICAgIHRleHQucmVwbGFjZShtYXRjaGVyLCBmdW5jdGlvbihtYXRjaCwgZXNjYXBlLCBpbnRlcnBvbGF0ZSwgZXZhbHVhdGUsIG9mZnNldCkge1xuICAgICAgc291cmNlICs9IHRleHQuc2xpY2UoaW5kZXgsIG9mZnNldCkucmVwbGFjZShlc2NhcGVyLCBlc2NhcGVDaGFyKTtcbiAgICAgIGluZGV4ID0gb2Zmc2V0ICsgbWF0Y2gubGVuZ3RoO1xuXG4gICAgICBpZiAoZXNjYXBlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIicrXFxuKChfX3Q9KFwiICsgZXNjYXBlICsgXCIpKT09bnVsbD8nJzpfLmVzY2FwZShfX3QpKStcXG4nXCI7XG4gICAgICB9IGVsc2UgaWYgKGludGVycG9sYXRlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIicrXFxuKChfX3Q9KFwiICsgaW50ZXJwb2xhdGUgKyBcIikpPT1udWxsPycnOl9fdCkrXFxuJ1wiO1xuICAgICAgfSBlbHNlIGlmIChldmFsdWF0ZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInO1xcblwiICsgZXZhbHVhdGUgKyBcIlxcbl9fcCs9J1wiO1xuICAgICAgfVxuXG4gICAgICAvLyBBZG9iZSBWTXMgbmVlZCB0aGUgbWF0Y2ggcmV0dXJuZWQgdG8gcHJvZHVjZSB0aGUgY29ycmVjdCBvZmZlc3QuXG4gICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfSk7XG4gICAgc291cmNlICs9IFwiJztcXG5cIjtcblxuICAgIC8vIElmIGEgdmFyaWFibGUgaXMgbm90IHNwZWNpZmllZCwgcGxhY2UgZGF0YSB2YWx1ZXMgaW4gbG9jYWwgc2NvcGUuXG4gICAgaWYgKCFzZXR0aW5ncy52YXJpYWJsZSkgc291cmNlID0gJ3dpdGgob2JqfHx7fSl7XFxuJyArIHNvdXJjZSArICd9XFxuJztcblxuICAgIHNvdXJjZSA9IFwidmFyIF9fdCxfX3A9JycsX19qPUFycmF5LnByb3RvdHlwZS5qb2luLFwiICtcbiAgICAgIFwicHJpbnQ9ZnVuY3Rpb24oKXtfX3ArPV9fai5jYWxsKGFyZ3VtZW50cywnJyk7fTtcXG5cIiArXG4gICAgICBzb3VyY2UgKyAncmV0dXJuIF9fcDtcXG4nO1xuXG4gICAgdHJ5IHtcbiAgICAgIHZhciByZW5kZXIgPSBuZXcgRnVuY3Rpb24oc2V0dGluZ3MudmFyaWFibGUgfHwgJ29iaicsICdfJywgc291cmNlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBlLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuXG4gICAgdmFyIHRlbXBsYXRlID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgcmV0dXJuIHJlbmRlci5jYWxsKHRoaXMsIGRhdGEsIF8pO1xuICAgIH07XG5cbiAgICAvLyBQcm92aWRlIHRoZSBjb21waWxlZCBzb3VyY2UgYXMgYSBjb252ZW5pZW5jZSBmb3IgcHJlY29tcGlsYXRpb24uXG4gICAgdmFyIGFyZ3VtZW50ID0gc2V0dGluZ3MudmFyaWFibGUgfHwgJ29iaic7XG4gICAgdGVtcGxhdGUuc291cmNlID0gJ2Z1bmN0aW9uKCcgKyBhcmd1bWVudCArICcpe1xcbicgKyBzb3VyY2UgKyAnfSc7XG5cbiAgICByZXR1cm4gdGVtcGxhdGU7XG4gIH07XG5cbiAgLy8gQWRkIGEgXCJjaGFpblwiIGZ1bmN0aW9uLiBTdGFydCBjaGFpbmluZyBhIHdyYXBwZWQgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8uY2hhaW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgaW5zdGFuY2UgPSBfKG9iaik7XG4gICAgaW5zdGFuY2UuX2NoYWluID0gdHJ1ZTtcbiAgICByZXR1cm4gaW5zdGFuY2U7XG4gIH07XG5cbiAgLy8gT09QXG4gIC8vIC0tLS0tLS0tLS0tLS0tLVxuICAvLyBJZiBVbmRlcnNjb3JlIGlzIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLCBpdCByZXR1cm5zIGEgd3JhcHBlZCBvYmplY3QgdGhhdFxuICAvLyBjYW4gYmUgdXNlZCBPTy1zdHlsZS4gVGhpcyB3cmFwcGVyIGhvbGRzIGFsdGVyZWQgdmVyc2lvbnMgb2YgYWxsIHRoZVxuICAvLyB1bmRlcnNjb3JlIGZ1bmN0aW9ucy4gV3JhcHBlZCBvYmplY3RzIG1heSBiZSBjaGFpbmVkLlxuXG4gIC8vIEhlbHBlciBmdW5jdGlvbiB0byBjb250aW51ZSBjaGFpbmluZyBpbnRlcm1lZGlhdGUgcmVzdWx0cy5cbiAgdmFyIHJlc3VsdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiB0aGlzLl9jaGFpbiA/IF8ob2JqKS5jaGFpbigpIDogb2JqO1xuICB9O1xuXG4gIC8vIEFkZCB5b3VyIG93biBjdXN0b20gZnVuY3Rpb25zIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdC5cbiAgXy5taXhpbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIF8uZWFjaChfLmZ1bmN0aW9ucyhvYmopLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgICB2YXIgZnVuYyA9IF9bbmFtZV0gPSBvYmpbbmFtZV07XG4gICAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYXJncyA9IFt0aGlzLl93cmFwcGVkXTtcbiAgICAgICAgcHVzaC5hcHBseShhcmdzLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gcmVzdWx0LmNhbGwodGhpcywgZnVuYy5hcHBseShfLCBhcmdzKSk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIEFkZCBhbGwgb2YgdGhlIFVuZGVyc2NvcmUgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyIG9iamVjdC5cbiAgXy5taXhpbihfKTtcblxuICAvLyBBZGQgYWxsIG11dGF0b3IgQXJyYXkgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyLlxuICBfLmVhY2goWydwb3AnLCAncHVzaCcsICdyZXZlcnNlJywgJ3NoaWZ0JywgJ3NvcnQnLCAnc3BsaWNlJywgJ3Vuc2hpZnQnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBtZXRob2QgPSBBcnJheVByb3RvW25hbWVdO1xuICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgb2JqID0gdGhpcy5fd3JhcHBlZDtcbiAgICAgIG1ldGhvZC5hcHBseShvYmosIGFyZ3VtZW50cyk7XG4gICAgICBpZiAoKG5hbWUgPT09ICdzaGlmdCcgfHwgbmFtZSA9PT0gJ3NwbGljZScpICYmIG9iai5sZW5ndGggPT09IDApIGRlbGV0ZSBvYmpbMF07XG4gICAgICByZXR1cm4gcmVzdWx0LmNhbGwodGhpcywgb2JqKTtcbiAgICB9O1xuICB9KTtcblxuICAvLyBBZGQgYWxsIGFjY2Vzc29yIEFycmF5IGZ1bmN0aW9ucyB0byB0aGUgd3JhcHBlci5cbiAgXy5lYWNoKFsnY29uY2F0JywgJ2pvaW4nLCAnc2xpY2UnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBtZXRob2QgPSBBcnJheVByb3RvW25hbWVdO1xuICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcmVzdWx0LmNhbGwodGhpcywgbWV0aG9kLmFwcGx5KHRoaXMuX3dyYXBwZWQsIGFyZ3VtZW50cykpO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIEV4dHJhY3RzIHRoZSByZXN1bHQgZnJvbSBhIHdyYXBwZWQgYW5kIGNoYWluZWQgb2JqZWN0LlxuICBfLnByb3RvdHlwZS52YWx1ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl93cmFwcGVkO1xuICB9O1xuXG4gIC8vIEFNRCByZWdpc3RyYXRpb24gaGFwcGVucyBhdCB0aGUgZW5kIGZvciBjb21wYXRpYmlsaXR5IHdpdGggQU1EIGxvYWRlcnNcbiAgLy8gdGhhdCBtYXkgbm90IGVuZm9yY2UgbmV4dC10dXJuIHNlbWFudGljcyBvbiBtb2R1bGVzLiBFdmVuIHRob3VnaCBnZW5lcmFsXG4gIC8vIHByYWN0aWNlIGZvciBBTUQgcmVnaXN0cmF0aW9uIGlzIHRvIGJlIGFub255bW91cywgdW5kZXJzY29yZSByZWdpc3RlcnNcbiAgLy8gYXMgYSBuYW1lZCBtb2R1bGUgYmVjYXVzZSwgbGlrZSBqUXVlcnksIGl0IGlzIGEgYmFzZSBsaWJyYXJ5IHRoYXQgaXNcbiAgLy8gcG9wdWxhciBlbm91Z2ggdG8gYmUgYnVuZGxlZCBpbiBhIHRoaXJkIHBhcnR5IGxpYiwgYnV0IG5vdCBiZSBwYXJ0IG9mXG4gIC8vIGFuIEFNRCBsb2FkIHJlcXVlc3QuIFRob3NlIGNhc2VzIGNvdWxkIGdlbmVyYXRlIGFuIGVycm9yIHdoZW4gYW5cbiAgLy8gYW5vbnltb3VzIGRlZmluZSgpIGlzIGNhbGxlZCBvdXRzaWRlIG9mIGEgbG9hZGVyIHJlcXVlc3QuXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoJ3VuZGVyc2NvcmUnLCBbXSwgZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gXztcbiAgICB9KTtcbiAgfVxufS5jYWxsKHRoaXMpKTtcbiJdfQ==
