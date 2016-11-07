//
// Created by Robin Reiter on 17.05.16.
// Copyright (c) 2016 Robin Reiter. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "PeakCore.h"

@class PeakCore;

typedef void (^PeakCoreCallback)(id callbackPayload);

@interface PeakModule : NSObject
@property NSString *name;
@property NSString *version;
@property NSString *namespace;
@property (nonatomic, readonly) PeakCore *peak;

- (void)onBeforeInstallation;
- (void)onAfterInstallation;

- (instancetype)initWithPeakCoreInstance:(PeakCore *)peakCore;
- (id)targetForNativeCall;

- (void)callJSFunctionName:(NSString *)functionName;
- (void)callJSFunctionName:(NSString *)functionName withPayload:(id)payload;
- (void)callJSFunctionName:(NSString *)functionName withCallback:(PeakCoreCallback)callback;
- (void)callJSFunctionName:(NSString *)functionName withPayload:(id)payload andCallback:(PeakCoreCallback)callback;
@end