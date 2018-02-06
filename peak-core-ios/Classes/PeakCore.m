//
// Created by Robin Reiter on 09.05.16.
// Copyright (c) 2016 Robin Reiter. All rights reserved.
//

#import "PeakCore.h"
#import "MethodDefinition.h"
#import "NativeCall.h"
#import "PeakModule.h"
#import "PeakSharedStore.h"

@interface PeakCore () <WKScriptMessageHandler>
@property NSString *namespace;
@property NSString *name;
@property NSString *version;
@property JSContext *context;
@property PeakWebViewContainer *hiddenWebView;
@end

@implementation PeakCore {
    PeakCoreOnReadyCallback _onReadyCallback;
}

- (void)basicInit {
    _namespace = @"peakCore";
    _name = @"peak-core-ios";
    _version = @"0.4.3";
    _modules = [@{} mutableCopy];
    _loadingMode = PeakCoreLoadingModeBundle;
    _debug = NO;
    _fadeInOnReady = YES;
    _fadeInDuration = 0.2f;

    [[PeakSharedStore instance] addValueChangedHandler:self];

    [self debugLog:[NSString stringWithFormat:@"PeakCore iOS Initialization (%@)", _version] withTag:[self loggingTag]];
}

- (void)webViewInit {
    WKUserContentController *contentController = [[WKUserContentController alloc] init];
    [contentController addScriptMessageHandler:self name:@"PeakCore"];

    WKWebViewConfiguration *configuration = [[WKWebViewConfiguration alloc] init];
    configuration.userContentController = contentController;

    _webViewConfiguration = configuration;

    if (self.fadeInOnReady) {
        self.webView.alpha = 0.0f;
    }
}

- (instancetype)initForLogicModule {
    self = [super init];
    if (self) {
        [self basicInit];

        self.context = [JSContext new];
        __weak PeakCore *weakSelf = self;
        self.context.exceptionHandler = ^(JSContext *context, JSValue *exception) {
            [weakSelf debugError:@"JSContext Exception: %@", exception.toString];
        };
    }

    return self;
}

- (instancetype)initForLogicModuleInHiddenWebViewInView:(UIView *)view {
    self = [super init];
    if (self) {
        [self basicInit];

        self.fadeInOnReady = NO;

        [self webViewInit];

        self.hiddenWebView = [[PeakWebViewContainer alloc] initWithFrame:CGRectZero];
        [view addSubview:self.hiddenWebView];
        [self.hiddenWebView generateWKWebViewWithPeakCore:self];
    }
    return self;
}


- (instancetype)init {
    self = [super init];
    if (self) {
        [self basicInit];
        [self webViewInit];
    }
    return self;
}

- (void)loadPeakComponentWithName:(NSString *)name {
    _onReadyCallback = nil;
    [self loadPeakComponentWithName:name withCompletion:nil];
}

- (void)loadPeakComponentWithName:(NSString *)name withCompletion:(PeakCoreOnReadyCallback)callback {

    if (self.webView == nil && self.context == nil) {
        [self logError:@"PeakCore has no WKWebView or JSContext. Cannot load Peak Component"];
        return;
    }

    _onReadyCallback = callback;

    if (self.loadingMode == PeakCoreLoadingModeLocalIP) {
        if (!self.debug) {
            return;
        }

        if (self.context) {
            NSString *javascriptContent = [self getJavascriptAppWithName:name];
            [self initializeContextWithJavascriptContent:javascriptContent];
            _componentName = name;
        } else {

            if (self.fadeInOnReady) {
                self.webView.alpha = 0;
            }

            NSString *completeURL = [self.localDevelopmentIPAdress stringByAppendingString:name];
            [self debugLog:@"Loading remote component from %@", completeURL];
            [self.webView loadRequest:[NSURLRequest requestWithURL:[[NSURL alloc] initWithString:completeURL]]];
            _componentName = name;
        }

        return;
    } else { // PeakCoreLoadingModeBundle

        // If this is a logic module
        if (self.context) {
            NSString *javascriptContent = [self getJavascriptAppWithName:name];
            [self initializeContextWithJavascriptContent:javascriptContent];
            _componentName = name;
            return;
        } else { // if this is a UI module

            if (self.fadeInOnReady) {
                self.webView.alpha = 0;
            }

            NSString *dirName = [NSString stringWithFormat:@"peak-components/%@", name];
            NSString *absoluteDirName = [NSString stringWithFormat:@"/peak-components/%@", name];

            NSURL *path = [[NSBundle mainBundle] URLForResource:@"index" withExtension:@"html" subdirectory:dirName];
            if (path == nil) {
                @throw [NSException exceptionWithName:@"Component not found" reason:@"Did you run gulp deploy? Did you include the folder 'peak-components' in your project?" userInfo:nil];
            }
            NSURL *url = [NSURL fileURLWithPath:[[[NSBundle mainBundle] resourcePath] stringByAppendingString:absoluteDirName] isDirectory:YES];
            [self debugLog:@"Loading bundle component from %@", dirName];
            [self.webView loadFileURL:path allowingReadAccessToURL:url];
            _componentName = name;
        }

    }
}

- (void)initializeContextWithJavascriptContent:(NSString *)jscontent {
    [self.context evaluateScript:@"window = {};  window.webkit = {}; window.webkit.messageHandlers = {}; window.webkit.messageHandlers.PeakCore = {};"];
    __weak PeakCore *weakSelf = self;
    self.context[@"window"][@"webkit"][@"messageHandlers"][@"PeakCore"][@"postMessage"] = ^(NSDictionary *call) {
        NativeCall *nativeCall = [NativeCall callWithDictionary:call];
        [weakSelf prepareNativeCallHandlingWithCall:nativeCall];
    };
    [self.context evaluateScript:jscontent];
}


- (NSString *)getJavascriptAppWithName:(NSString *)name {

    if (self.loadingMode == PeakCoreLoadingModeBundle) {
        NSString *dirName = [NSString stringWithFormat:@"peak-components/%@/js", name];
        NSString *path = [[NSBundle mainBundle] pathForResource:@"build" ofType:@"js" inDirectory:dirName];
        if (path == nil) {
            @throw [NSException exceptionWithName:@"Component not found" reason:@"Did you run gulp deploy? Did you include the folder 'peak-components' in your project?" userInfo:nil];
        }

        return [NSString stringWithContentsOfFile:path encoding:NSUTF8StringEncoding error:NULL];
    } else {
        NSString *path = [name stringByAppendingString:@"/js/build.js"];
        NSString *completeURL = [self.localDevelopmentIPAdress stringByAppendingString:path];
        NSString *jsContent = [NSString stringWithContentsOfURL:[[NSURL alloc] initWithString:completeURL] encoding:NSUTF8StringEncoding error:nil];
        return jsContent;
    }

}

- (id)useModule:(Class)moduleClass {

    NSAssert((moduleClass != nil), @"No Class given.");
    NSAssert([moduleClass isSubclassOfClass:[PeakModule class]], @"The given module is not a subclass of <PeakModule>.");
    NSAssert(moduleClass != [PeakModule class], @"You cannot add the PeakModule Class as a new module. Create a subclass instead!");

    BOOL found = NO;
    for (PeakModule *m in self.modules) {
        if ([m.class isKindOfClass:moduleClass]) {
            found = YES;
            [self debugLog:@"PeakModule '%@' already installed!", m.name];
            return m;
        }
    }

    id module = [moduleClass alloc];

    SEL selector = NSSelectorFromString(@"initWithPeakCoreInstance:");
    IMP imp = [moduleClass methodForSelector:selector];
    void (*func)(id, SEL, PeakCore*) = (void *)imp;

    func(moduleClass, selector, self);

    PeakModule *m = (PeakModule *) module;
    [m onBeforeInstallation];

    self.modules[m.namespace] = module;

    [m onAfterInstallation];
    return module;
}


- (void)userContentController:(WKUserContentController *)userContentController didReceiveScriptMessage:(WKScriptMessage *)message {

    if (message == nil || message.name == nil || message.body == nil) {
        return;
    }

    if ([message.name isEqualToString:@"PeakCore"]) {

        dispatch_async(dispatch_get_main_queue(), ^{

            NativeCall *nativeCall = [NativeCall callWithMessage:message];
            // if this call is for the peakCore namespace (this class)

            [self prepareNativeCallHandlingWithCall:nativeCall];

        });

    }
}

- (void)prepareNativeCallHandlingWithCall:(NativeCall *)call {
    if ([call.methodDefinition.namespace isEqualToString:self.namespace]) {
        [self handleNativeCall:call onTarget:self];
        return;
    } else {
        PeakModule *module = self.modules[call.methodDefinition.namespace];
        if (module) {
            id target = [module targetForNativeCall];
            [self handleNativeCall:call onTarget:target];
        } else {
            [self debugError:@"Module with namespace <%@> not installed!", call.methodDefinition.namespace];
        }
    }
}



- (void)callJSFunctionName:(NSString *)functionName inNamespace:(NSString *)namespace {
    [self callJSFunctionName:functionName inNamespace:namespace withPayload:nil andCallback:nil];
}


- (void)callJSFunctionName:(NSString *)functionName inNamespace:(NSString *)namespace withPayload:(id)payload {
    [self callJSFunctionName:functionName inNamespace:namespace withPayload:payload andCallback:nil];
}

- (void)callJSFunctionName:(NSString *)functionName inNamespace:(NSString *)namespace withCallback:(PeakCoreCallback)callback {
    [self callJSFunctionName:functionName inNamespace:namespace withPayload:nil andCallback:callback];
}

- (void)callJSFunctionName:(NSString *)functionName inNamespace:(NSString *)namespace withPayload:(id)payload andCallback:(PeakCoreCallback)callback {

    if (functionName == nil || functionName.length == 0) {
        [self debugLog:@"Cannot call a JS function without a function name!"];
        return;
    }

    if (namespace == nil || namespace.length == 0) {
        [self debugLog:@"Cannot call '%@' without a namespace!", functionName];
        return;
    }


    NSString *jsFunctionCall;
    if (payload) {
        NSString *serializedPayload = [self serializePayload:payload];
        jsFunctionCall = [NSString stringWithFormat:@"window.peak.callJS('%@', '%@', %@);", namespace, functionName, serializedPayload];
    } else {
        jsFunctionCall = [NSString stringWithFormat:@"window.peak.callJS('%@', '%@');", namespace, functionName];
    }

    PeakCoreCallback weakCallback = callback;

    if (self.context) {

        dispatch_async(dispatch_get_global_queue( DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
            [self.context evaluateScript:jsFunctionCall];
        });

    } else {
        [self.webView evaluateJavaScript:jsFunctionCall completionHandler:^(id callbackPayload, NSError *error) {
            if (weakCallback)
                weakCallback(callbackPayload);
        }];
    }

}

- (void)handleNativeCall:(NativeCall *)call onTarget:(id)target {

    if (call == nil || target == nil) {
        return;
    }

    NSString *selectorString = [NSString stringWithFormat:@"%@", call.methodDefinition.functionName];

    bool hasPayload = (call.methodDefinition.payloadType != MethodDefinitionPayloadTypeNone);
    bool hasCallback = (call.callbackKey != nil);

    if ((hasPayload && !hasCallback)) {
        selectorString = [selectorString stringByAppendingFormat:@":"];
    } else if (hasPayload && hasCallback) {
        selectorString = [selectorString stringByAppendingFormat:@":withCallback:"];
    } else if (!hasPayload && hasCallback) {
        selectorString = [selectorString stringByAppendingFormat:@"WithCallback:"];
    }

    NSMethodSignature *methodSignature = [target methodSignatureForSelector:NSSelectorFromString(selectorString)];

    if (methodSignature == nil) {
        [self debugLog:@"<%@> class has no method '%@' defined!", [target class], selectorString];
        return;
    }

    NSInvocation *invocation = [NSInvocation invocationWithMethodSignature:methodSignature];

    if (hasPayload && !hasCallback) {
        id payload = call.payload;
        [invocation setArgument:&payload atIndex:2];
    } else if (!hasPayload && hasCallback) {
        PeakCoreCallback callback = [[self generateCallbackForCall:call] copy];
        [invocation setArgument:&callback atIndex:2];
        [invocation retainArguments];
    } else if (hasPayload && hasCallback) {
        id payload = call.payload;
        [invocation setArgument:&payload atIndex:2];
        PeakCoreCallback callback = [self generateCallbackForCall:call];
        [invocation setArgument:&callback atIndex:3];
        [invocation retainArguments];
    }

    [invocation setTarget:target];
    [invocation setSelector:NSSelectorFromString(selectorString)];

    if ([target respondsToSelector:NSSelectorFromString(selectorString)]) {
        [invocation invoke];
    }

}

- (PeakCoreCallback)generateCallbackForCall:(NativeCall *)call {

    __block PeakCore *weakSelf = self;
    __block NSString *weakCallbackKey = call.callbackKey;

    PeakCoreCallback callback = ^(id callbackPayload) {

        id serializedPayload = [weakSelf serializePayload:callbackPayload];
        NSString *callbackCall = [NSString stringWithFormat:@"window.peak.callCallback('%@', %@);", weakCallbackKey, serializedPayload];

        if (weakSelf.context) {
            [weakSelf.context evaluateScript:callbackCall];
        } else {
            [weakSelf.webView evaluateJavaScript:callbackCall completionHandler:nil];
        }

        weakSelf = nil;
        weakCallbackKey = nil;
    };

    return callback;
}

- (id)serializePayload:(id)payload {

    if ([payload isKindOfClass:[NSArray class]] || [payload isKindOfClass:[NSDictionary class]]) {
        NSError *error;
        NSData *jsonData = [NSJSONSerialization dataWithJSONObject:payload
                                                           options:0
                                                             error:&error];
        if (!jsonData) {
            return @"";
        } else {

            NSString *jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
            return jsonString;
        }
    } else {

        if ([payload isKindOfClass:[NSString class]]) {
            return [NSString stringWithFormat:@"'%@'", payload];
        }
        return payload;
    }

    return nil;
}

/**
 * Gets called by the native userland side.
 * @param key
 * @return
 */
- (NSString *)getValueForKey:(NSString *)key {
    return [[PeakSharedStore instance] getSharedValue:key];
}

/**
 * Gets called by the native userland side.
 * @param value
 * @param key
 */
- (void)set:(NSString *)value forKey:(NSString *)key {
    NSDictionary *payload = @{@"key": key, @"value": value};

    [[PeakSharedStore instance] setSharedValue:payload fromSender:self];
    [self callJSFunctionName:@"setSharedValue" inNamespace:@"peakCore" withPayload:payload];

}

/**
 * Gets called by the native userland side.
 * @param value
 * @param key
 */
- (void)setPersistent:(NSString *)value forKey:(NSString *)key {
    NSDictionary *payload = @{
            @"key": key,
            @"value": value,
            @"secure": @(false)
    };

    [[PeakSharedStore instance] setSharedPersistentValue:payload fromSender:self];
    [self callJSFunctionName:@"setSharedValue" inNamespace:@"peakCore" withPayload:payload];

}


/**
 * Gets called by the native userland side.
 * @param value
 * @param key
 */
- (void)setPersistentSecure:(NSString *)value forKey:(NSString *)key {
    NSDictionary *payload = @{
            @"key": key,
            @"value": value,
            @"secure": @(true)
    };

    [[PeakSharedStore instance] setSharedPersistentValue:payload fromSender:self];
    [self callJSFunctionName:@"setSharedValue" inNamespace:@"peakCore" withPayload:payload];

}


- (void)delete:(NSString *)key {
    [[PeakSharedStore instance] deleteSharedValue:key fromSender:self];
    [self callJSFunctionName:@"deleteSharedValue" inNamespace:@"peakCore" withPayload:key];
}
- (void)deletePersistent:(NSString *)key {

    NSDictionary *payload = @{
            @"key": key,
            @"secure": @(false)
    };
    [[PeakSharedStore instance] deleteSharedPersistentValue:payload fromSender:self];
    [self callJSFunctionName:@"deleteSharedValue" inNamespace:@"peakCore" withPayload:key];

}
- (void)deletePersistentSecure:(NSString *)key {

    NSDictionary *payload = @{
            @"key": key,
            @"secure": @(true)
    };
    [[PeakSharedStore instance] deleteSharedPersistentValue:payload fromSender:self];
    [self callJSFunctionName:@"deleteSharedValue" inNamespace:@"peakCore" withPayload:key];
}



/**
 * Gets called by the JS side
 * @param data
 */
- (void)setSharedValue:(NSDictionary *)data {
    [[PeakSharedStore instance] setSharedValue:data fromSender:self];
}

/**
 * Gets called by the JS side
 * @param data
 */
- (void)setSharedPersistentValue:(NSDictionary *)data {
    [[PeakSharedStore instance] setSharedPersistentValue:data fromSender:self];
}

/**
 * Gets called by the JS side
 */
- (void)getSharedStoreWithCallback:(PeakCoreCallback)callback {
    callback([[PeakSharedStore instance] getStore]);
}

- (void)deleteSharedValue:(NSString *)key {
    [[PeakSharedStore instance] deleteSharedValue:key fromSender:self];
}

- (void)deleteSharedPersistentValue:(NSDictionary *)data {
    [[PeakSharedStore instance] deleteSharedPersistentValue:data fromSender:self];
}


/**
 * Gets called by the PeakSharedStore if a value has changed
 * @param value
 * @param key
 */
- (void)onChangedStorePayload:(NSDictionary *)payload {
    [self callJSFunctionName:@"setSharedValue" inNamespace:@"peakCore" withPayload:payload];
}

- (void)onDeletedStoreValue:(NSString *)key {
    [self callJSFunctionName:@"deleteSharedValue" inNamespace:@"peakCore" withPayload:key];
}


- (void)onReady {
    [self callJSFunctionName:@"enableDebug" inNamespace:@"peakCore" withPayload:@(self.debug)];
    [self set:@"true" forKey:@"peakReady"];

    if (self.fadeInOnReady) {
        [UIView animateWithDuration:self.fadeInDuration animations:^{
            self.webView.alpha = 1.0f;
        }];
    }

    if (_onReadyCallback) {
        [self debugLog:@"onReady() called"];
        _onReadyCallback();
    } else {
        [self debugLog:@"onReady() called but no callback was defined"];
    }
}

#pragma mark - Logging

/**
 * Convenient logging method. Use this within PeakCore only! (use debugLog:withTag: for userland or custom module logging)
 * Messages will not be forwarded to console when self.debug == NO
 * @param message
 * @param tag
 */
- (void)debugLog:(NSString *)formatString, ... {
    if (self.debug) {
        va_list args;
        va_start(args, formatString);
        [self debugLog:[[NSString alloc] initWithFormat:formatString arguments:args] withTag:[self loggingTag]];
        va_end(args);
    }
}

/**
 * External logging method. Use this for external classes like PeakUserland or other modules
 * Messages will not be forwarded to console when self.debug == NO
 * @param message
 * @param tag
 */
- (void)debugLog:(NSString *)message withTag:(NSString *)tag {
    [self log:[tag stringByAppendingFormat:@" %@", message]];
}

/**
 * Convenient logging method. Use this within PeakCore only! (use debugLog:withTag: for userland or custom module logging)
 * Messages will not be forwarded to console when self.debug == NO
 * @param message
 * @param tag
 */
- (void)debugError:(NSString *)formatString, ... {
    if (self.debug) {
        va_list args;
        va_start(args, formatString);
        [self debugError:[[NSString alloc] initWithFormat:formatString arguments:args] withTag:[self loggingTag]];
        va_end(args);
    }
}

/**
 * External logging method. Use this for external classes like PeakUserland or other modules
 * Messages will not be forwarded to console when self.debug == NO
 * @param message
 * @param tag
 */
- (void)debugError:(NSString *)message withTag:(NSString *)tag {
    [self logError:[tag stringByAppendingFormat:@" ERROR -> %@", message]];
}





#pragma mark - Required Native Methods

/**
 * Logs that are printed by the javascript side
 * @param message
 */
- (void)log:(NSString *)message {
    NSLog(@"%@", message);
}

/**
 * Errors that are printed by the javascript side
 * @param message
 */
- (void)logError:(NSString *)message {
    NSLog(@"%@", message);
//    [[NSException exceptionWithName:message reason:@"" userInfo:nil] raise];
}



#pragma mark - Helpers

/**
 * Returns a logging tag for the PeakCore Module. F.ex. 'peak-core-ios (0.1.8)'
 * @return
 */
- (NSString *)loggingTag {
    NSString *name = (self.componentName) ? [NSString stringWithFormat:@"[%@] ", self.componentName] : @"";
    return [NSString stringWithFormat:@"iOS %@~>", name];
}


- (void)dealloc {
    [[PeakSharedStore instance] removeValueChangedHandler:self];
}


@end