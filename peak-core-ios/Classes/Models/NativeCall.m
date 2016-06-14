//
// Created by Robin Reiter on 16.05.16.
// Copyright (c) 2016 Robin Reiter. All rights reserved.
//

#import "NativeCall.h"
#import "MethodDefinition.h"


@implementation NativeCall {

}
+ (NativeCall *)callWithMessage:(WKScriptMessage *)message {
    return [[NativeCall alloc] initWithMessage:message];
}

- (instancetype)initWithMessage:(WKScriptMessage *)message {
    self = [super init];
    if (self) {

        if (message != nil) {
            NSDictionary *msg = (NSDictionary *) message.body;
            if (msg != nil) {

                _methodDefinition = [MethodDefinition definitionWithMessage:message];
                _payload = msg[@"payload"] ?: nil;
                _callbackKey = msg[@"callbackKey"] ?: nil;

            }
        }
    }

    return self;
}

@end