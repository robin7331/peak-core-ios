//
// Created by Robin Reiter on 16.05.16.
// Copyright (c) 2016 Robin Reiter. All rights reserved.
//

#import "MethodDefinition.h"


@implementation MethodDefinition {

}

+ (MethodDefinition *)definitionWithMessage:(WKScriptMessage *)message {
    return [[MethodDefinition alloc] initWithMessage:message];
}

- (instancetype)initWithMessage:(WKScriptMessage *)message {
    self = [super init];
    if (self) {

        _namespace = nil;
        _functionName = nil;
        _payloadType = MethodDefinitionPayloadTypeNone;
        _typeOfPayloadData = @{};

        if (message != nil) {
            NSDictionary *msg = (NSDictionary *) message.body;
            if (msg != nil) {
                NSDictionary *methodDefinition = msg[@"methodDefinition"];

                if (methodDefinition != nil) {
                    _namespace = methodDefinition[@"namespace"];
                    _functionName = methodDefinition[@"name"];
                    _payloadType = [self getPayloadTypeForMethodDefinition:methodDefinition[@"payload"]];
                    _typeOfPayloadData = [self getTypeOfPayloadDataForMethodDefinition:methodDefinition[@"payload"]];
                }
            }
        }
    }

    return self;
}



- (MethodDefinitionPayloadType)getPayloadTypeForMethodDefinition:(NSDictionary *)payload {

    NSString *payloadType = nil;
    if (payload && payload[@"dataType"]) {
        payloadType = payload[@"dataType"];
    }

    return [self payloadTypeForStringType:payloadType];
}

- (NSDictionary *)getTypeOfPayloadDataForMethodDefinition:(NSDictionary *)payload {

    NSDictionary *payloadData = nil;
    if (payload && payload[@"data"]) {
        payloadData = payload[@"data"];
    }

    NSMutableDictionary *results = [@{} mutableCopy];

    if (payloadData) {
        for (NSString* key in payloadData.allKeys) {
            MethodDefinitionPayloadType type = [self payloadTypeForStringType:payloadData[key]];
            results[key] = @(type);
        }
    }
    return results;
}

- (MethodDefinitionPayloadType)payloadTypeForStringType:(NSString *)stringType {
    if (stringType) {

        if ([stringType isEqualToString:@"string"])
            return MethodDefinitionPayloadTypeString;

        if ([stringType isEqualToString:@"number"])
            return MethodDefinitionPayloadTypeNumber;

        if ([stringType isEqualToString:@"object"])
            return MethodDefinitionPayloadTypeObject;

        if ([stringType isEqualToString:@"boolean"])
            return MethodDefinitionPayloadTypeBoolean;

        if ([stringType isEqualToString:@"none"])
            return MethodDefinitionPayloadTypeNone;

    }

    return MethodDefinitionPayloadTypeNone;
}

@end