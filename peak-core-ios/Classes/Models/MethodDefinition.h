//
// Created by Robin Reiter on 16.05.16.
// Copyright (c) 2016 Robin Reiter. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <WebKit/WebKit.h>

typedef NS_ENUM(NSInteger, MethodDefinitionPayloadType) {
    MethodDefinitionPayloadTypeString,
    MethodDefinitionPayloadTypeNumber,
    MethodDefinitionPayloadTypeObject,
    MethodDefinitionPayloadTypeBoolean,
    MethodDefinitionPayloadTypeNone
};


@interface MethodDefinition : NSObject
@property (readonly) NSString *namespace;
@property (readonly) NSString *functionName;
@property (readonly) MethodDefinitionPayloadType payloadType;
@property (readonly) NSDictionary *typeOfPayloadData;

+ (MethodDefinition *)definitionWithMessage:(WKScriptMessage *)message;
- (instancetype)initWithMessage:(WKScriptMessage *)message;
@end