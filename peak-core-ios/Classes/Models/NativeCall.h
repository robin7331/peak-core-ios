//
// Created by Robin Reiter on 16.05.16.
// Copyright (c) 2016 Robin Reiter. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <WebKit/WebKit.h>

@class MethodDefinition;


@interface NativeCall : NSObject

@property (readonly) MethodDefinition *methodDefinition;
@property (readonly) id payload;
@property (readonly) NSString *callbackKey;

+ (NativeCall *)callWithMessage:(WKScriptMessage *)message;
- (instancetype)initWithMessage:(WKScriptMessage *)message;
@end