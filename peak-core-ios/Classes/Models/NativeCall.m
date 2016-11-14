//
// Created by Robin Reiter on 16.05.16.
// Copyright (c) 2016 Robin Reiter. All rights reserved.
//

#import "NativeCall.h"
#import "MethodDefinition.h"


@implementation NativeCall {

}
+ (NativeCall *)callWithDictionary:(NSDictionary *)dict {
    return [[NativeCall alloc] initWithDictionary:dict];
}

- (instancetype)initWithDictionary:(NSDictionary *)dict {
    self = [super init];
    if (self) {
        _methodDefinition = [MethodDefinition definitionWithDictionary:dict];
        _payload = dict[@"payload"] ?: nil;
        _callbackKey = dict[@"callbackKey"] ?: nil;
    }
    return self;
}

+ (NativeCall *)callWithMessage:(WKScriptMessage *)message {
    return [[NativeCall alloc] initWithMessage:message];
}


- (instancetype)initWithMessage:(WKScriptMessage *)message {
    if (message != nil) {
        NSDictionary *msg = (NSDictionary *) message.body;
        if (msg != nil) {
            return [self initWithDictionary:msg];
        }
    }
    return nil;
}

@end