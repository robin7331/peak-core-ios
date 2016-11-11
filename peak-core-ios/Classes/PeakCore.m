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
@property PeakSharedStore *store;
@end

@implementation PeakCore {
    PeakCoreOnReadyCallback _onReadyCallback;
}

- (void)basicInit {
    _namespace = @"peakCore";
    _name = @"peak-core-ios";
    _version = @"0.1.8";
    _modules = [@{} mutableCopy];
    _loadingMode = PeakCoreLoadingModeBundle;

    WKUserContentController *contentController = [[WKUserContentController alloc] init];
    [contentController addScriptMessageHandler:self name:@"PeakCore"];

    WKWebViewConfiguration *configuration = [[WKWebViewConfiguration alloc] init];
    configuration.userContentController = contentController;

    _webViewConfiguration = configuration;

    self.store = [PeakSharedStore instance];
}

- (instancetype)initForLogicModule {
    self = [super init];
    if (self) {
        [self basicInit];
        self.webView = [[WKWebView alloc] initWithFrame:CGRectZero configuration:self.webViewConfiguration];
    }

    return self;
}

- (instancetype)init {
    self = [super init];
    if (self) {
        [self basicInit];
    }
    return self;
}

- (void)loadPeakComponentWithName:(NSString *)name {
    _onReadyCallback = nil;
    [self loadPeakComponentWithName:name withCompletion:nil];
}

- (void)loadPeakComponentWithName:(NSString *)name withCompletion:(PeakCoreOnReadyCallback)callback {

    if (self.webView == nil) {
        [self logError:@"PeakCore has no WKWebView. Cannot load Peak Component"];
        return;
    }

    _onReadyCallback = callback;

#ifdef DEBUG
    if (self.loadingMode == PeakCoreLoadingModeLocalIP) {
        NSString *completeURL = [self.localDevelopmentIPAdress stringByAppendingPathComponent:name];
        [self.webView loadRequest:[NSURLRequest requestWithURL:[[NSURL alloc] initWithString:completeURL]]];
        return;
    }
#endif

    NSString *dirName = [NSString stringWithFormat:@"peak-components/%@", name];
    NSString *absoluteDirName = [NSString stringWithFormat:@"/peak-components/%@", name];

    NSURL *path = [[NSBundle mainBundle] URLForResource:@"index" withExtension:@"html" subdirectory:dirName];
    if (path == nil) {
        @throw [NSException exceptionWithName:@"Component not found" reason:@"Did you run gulp deploy? Did you include the folder 'peak-components' in your project?" userInfo:nil];
    }
    NSURL *url = [NSURL fileURLWithPath:[[[NSBundle mainBundle] resourcePath] stringByAppendingString:absoluteDirName] isDirectory:YES];
    [self.webView loadFileURL:path allowingReadAccessToURL:url];
}


- (id)useModule:(Class)moduleClass {

    NSAssert((moduleClass != nil), @"No Class given.");
    NSAssert([moduleClass isSubclassOfClass:[PeakModule class]], @"The given module is not a subclass of <PeakModule>.");
    NSAssert(moduleClass != [PeakModule class], @"You cannot add the PeakModule Class as a new module. Create a subclass instead!");

    BOOL found = NO;
    for (PeakModule *m in self.modules) {
        if ([m.class isKindOfClass:moduleClass]) {
            found = YES;
            NSLog(@"PeakModule '%@' already installed!", m.name);
            return m;
        }
    }

    id module = [[moduleClass alloc] performSelector:NSSelectorFromString(@"initWithPeakCoreInstance:") withObject:self];
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
            if ([nativeCall.methodDefinition.namespace isEqualToString:self.namespace]) {
                [self handleNativeCall:nativeCall onTarget:self];
                return;
            } else {
                PeakModule *module = self.modules[nativeCall.methodDefinition.namespace];
                if (module) {
                    id target = [module targetForNativeCall];
                    [self handleNativeCall:nativeCall onTarget:target];
                } else {
                    NSString *msg = [NSString stringWithFormat:@"Module with namespace <%@> not installed!", nativeCall.methodDefinition.namespace];
                    [self logError:msg withTag:[self loggingTag]];
                }
            }

        });


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
        [self log:@"Cannot call a JS function without a function name!" withTag:self.name];
        return;
    }

    if (namespace == nil || namespace.length == 0) {
        NSString *msg = [NSString stringWithFormat:@"Cannot call '%@' without a namespace!", functionName];
        [self log:msg withTag:self.name];
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
    [self.webView evaluateJavaScript:jsFunctionCall completionHandler:^(id callbackPayload, NSError *error) {
        if (weakCallback)
            weakCallback(callbackPayload);
    }];

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
        NSString *msg = [NSString stringWithFormat:@"<%@> class has no method '%@' defined!", [target class], selectorString];
        [self log:msg withTag:self.name];
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

    __weak PeakCore *weakSelf = self;
    __weak NSString *weakCallbackKey = call.callbackKey;

    PeakCoreCallback callback = ^(id callbackPayload) {
        PeakCore *innerSelf = weakSelf;
        NSString *innerCallbackKey = weakCallbackKey;

        id serializedPayload = [innerSelf serializePayload:callbackPayload];

        NSString *callbackCall = [NSString stringWithFormat:@"window.peak.callCallback('%@', %@);", innerCallbackKey, serializedPayload];
        [innerSelf.webView evaluateJavaScript:callbackCall completionHandler:nil];
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


- (NSString *)loggingTag {
    return [NSString stringWithFormat:@"%@ (%@)", self.name, self.version];
}

- (void)log:(id)message withTag:(NSString *)tag {
    [self log:[tag stringByAppendingFormat:@" %@", message]];
}

- (void)log:(id)message {
    NSLog(message);
}

- (void)logError:(id)message withTag:(NSString *)tag {
    [self logError:[tag stringByAppendingFormat:@" %@", message]];
}

- (void)logError:(id)message {
    NSLog(message);
//    [[NSException exceptionWithName:message reason:@"" userInfo:nil] raise];
}

- (void)debugLog:(id)message {
    [self log:message withTag:[self loggingTag]];
}

- (void)debugError:(id)message {
    [self logError:message withTag:[self loggingTag]];
}

- (void)set:(NSString *)value forKey:(NSString *)key {
    NSDictionary *payload = @{@"key": key, @"value": value};

    [self.store setSharedValue:payload];
    [self callJSFunctionName:@"setSharedValue" inNamespace:@"peakCore" withPayload:payload];

}

- (void)setPersistent:(NSString *)value forKey:(NSString *)key {
    NSDictionary *payload = @{
            @"key": key,
            @"value": value,
            @"secure": @(false)
    };

    [self.store setSharedPersistentValue:payload];
    [self callJSFunctionName:@"setSharedValue" inNamespace:@"peakCore" withPayload:payload];

}

- (void)setPersistentSecure:(NSString *)value forKey:(NSString *)key {
    NSDictionary *payload = @{
            @"key": key,
            @"value": value,
            @"secure": @(true)
    };

    [self.store setSharedPersistentValue:payload];
    [self callJSFunctionName:@"setSharedValue" inNamespace:@"peakCore" withPayload:payload];

}

- (NSString *)getValueForKey:(NSString *)key {
    return [self.store getSharedValue:key];
}

- (void)setSharedValue:(NSDictionary *)data {
    [self.store setSharedValue:data];
}

- (void)setSharedPersistentValue:(NSDictionary *)data {
    [self.store setSharedPersistentValue:data];
}

- (void)getSharedStoreWithCallback:(PeakCoreCallback)callback {
    NSLog(@"getSharedStore called");
    callback(@{
            @"store": [self.store getStore]
    });
}


- (void)onReady {
    if (_onReadyCallback) {
        [self log:@"onReady() called" withTag:[self loggingTag]];
        _onReadyCallback();
        _onReadyCallback = nil;
    } else {
        [self log:@"onReady() called but no callback was defined" withTag:[self loggingTag]];
    }
}

@end