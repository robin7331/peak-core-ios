//
// Created by Robin Reiter on 17.05.16.
// Copyright (c) 2016 Robin Reiter. All rights reserved.
//

#import "PeakModule.h"

@interface PeakModule()

@end

@implementation PeakModule

- (instancetype)initWithPeakCoreInstance:(PeakCore *)peakCore {
    self = [super init];
    if (self) {
        _peak = peakCore;
    }

    return self;
}

- (void)onBeforeInstallation {};
- (void)onAfterInstallation {
    NSLog(@"Module %@ with version %@ was installed", self.name, self.version);
};

-(id)targetForNativeCall {
    return self;
};

- (void)callJSFunctionName:(NSString *)functionName{
    [self.peak callJSFunctionName:functionName inNamespace:self.namespace];
}

- (void)callJSFunctionName:(NSString *)functionName withPayload:(id)payload {
    [self.peak callJSFunctionName:functionName inNamespace:self.namespace withPayload:payload];
}

- (void)callJSFunctionName:(NSString *)functionName withCallback:(id)callback {
    [self.peak callJSFunctionName:functionName inNamespace:self.namespace withPayload:nil andCallback:callback];
}

- (void)callJSFunctionName:(NSString *)functionName inNamespace:(NSString *)namespace withPayload:(id)payload andCallback:(PeakCoreCallback)callback {
    [self.peak callJSFunctionName:functionName inNamespace:self.namespace withPayload:payload andCallback:callback];
}

@end