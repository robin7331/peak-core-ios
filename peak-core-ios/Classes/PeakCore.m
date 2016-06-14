//
// Created by Robin Reiter on 09.05.16.
// Copyright (c) 2016 Robin Reiter. All rights reserved.
//

#import "PeakCore.h"
#import "MethodDefinition.h"
#import "NativeCall.h"
#import "PeakModule.h"

@interface PeakCore () <WKScriptMessageHandler>
@property NSString *namespace;
@property NSString *name;
@property NSString *version;
@end

@implementation PeakCore {

}

- (instancetype)init {
    self = [super init];
    if (self) {
        _namespace = @"peakCore";
        _name = @"peak-core-ios";
        _version = @"1.0.0";
        _modules = [@{} mutableCopy];

        WKUserContentController *contentController = [[WKUserContentController alloc] init];
        [contentController addScriptMessageHandler:self name:@"PeakCore"];

        WKWebViewConfiguration *configuration = [[WKWebViewConfiguration alloc] init];
        configuration.userContentController = contentController;

        _webViewConfiguration = configuration;
    }

    return self;
}


- (id)useModule:(Class)moduleClass {

    NSAssert((moduleClass != nil), @"No Class given.");
    NSAssert([moduleClass isSubclassOfClass:[PeakModule class]], @"The given module is not a subclass of <PeakModule>.");
    NSAssert(moduleClass != [PeakModule class], @"You cannot add the PeakModule Class as a new module. Create a subclass instead!");

    BOOL found = NO;
    for( PeakModule *m in self.modules) {
        if ([m.class isKindOfClass:moduleClass]) {
            found = YES;
            NSLog(@"PeakModule '%@' already installed!", m.name);
            return m;
        }
    }

    id module = [[moduleClass alloc] performSelector:NSSelectorFromString(@"initWithPeakCoreInstance:") withObject:self];
    PeakModule *m = (PeakModule *)module;
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
    }
}


- (void)callJSFunctionName:(NSString *)functionName inNamespace:(NSString *)namespace {
    [self callJSFunctionName:functionName inNamespace:namespace withPayload:nil andCallback:nil];
}

- (void)callJSFunctionName:(NSString *)functionName inNamespace:(NSString *)namespace withPayload:(id)payload {
    [self callJSFunctionName:functionName inNamespace:namespace withPayload:payload andCallback:nil];
}

- (void)callJSFunctionName:(NSString *)functionName inNamespace:(NSString *)namespace withCallback:(id)callback {
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
        jsFunctionCall = [NSString stringWithFormat:@"window.peak.callJS('%@', '%@', '%@');", namespace, functionName, serializedPayload];
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
        PeakCoreCallback callback = [self generateCallbackForCall:call];
        [invocation setArgument:&callback atIndex:2];
    } else if (hasPayload && hasCallback) {
        id payload = call.payload;
        [invocation setArgument:&payload atIndex:2];
        PeakCoreCallback callback = [self generateCallbackForCall:call];
        [invocation setArgument:&callback atIndex:3];
    }

    [invocation setTarget:target];
    [invocation setSelector:NSSelectorFromString(selectorString)];

    if ([target respondsToSelector:NSSelectorFromString(selectorString)]) {
        [invocation invoke];
    }

}

- (PeakCoreCallback)generateCallbackForCall:(NativeCall *)call {
    PeakCore *weakSelf = self;
    NSString *weakCallbackKey = call.callbackKey;
    PeakCoreCallback callback = ^(id callbackPayload) {
        id serializedPayload = [weakSelf serializePayload:callbackPayload];

        NSString *callbackCall = [NSString stringWithFormat:@"window.peak.callCallback('%@', %@);", weakCallbackKey, serializedPayload];
        [weakSelf.webView evaluateJavaScript:callbackCall completionHandler:nil];
    };

    return callback;
}

- (id)serializePayload:(id)payload {

    if ([[payload class] isKindOfClass:[NSArray class]] || [[payload class] isKindOfClass:[NSDictionary class]]) {
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

        if ([[payload class] isKindOfClass:[NSString class]]) {
            return [NSString stringWithFormat:@"'%@'", payload];
        }
        return payload;
    }

    return nil;
}


-(NSString *)loggingTag {
    return [NSString stringWithFormat:@"%@ (%@)", self.name, self.version];
}

-(void)log:(id)message withTag:(NSString *)tag {
    [self log:[tag stringByAppendingFormat:@" %@", message]];
}

- (void)log:(id)message {
    NSLog(message);
}

-(void)logError:(id)message withTag:(NSString *)tag {
    [self logError:[tag stringByAppendingFormat:@" %@", message]];
}

- (void)logError:(id)message {
    NSLog(message);
//    [[NSException exceptionWithName:message reason:@"" userInfo:nil] raise];
}

@end