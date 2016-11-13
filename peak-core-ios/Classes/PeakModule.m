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
    [self debugLog:@"Module with version %@ installed", self.version];
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

- (void)callJSFunctionName:(NSString *)functionName withCallback:(PeakCoreCallback)callback {
    [self.peak callJSFunctionName:functionName inNamespace:self.namespace withPayload:nil andCallback:callback];
}

- (void)callJSFunctionName:(NSString *)functionName withPayload:(id)payload andCallback:(PeakCoreCallback)callback {
    [self.peak callJSFunctionName:functionName inNamespace:self.namespace withPayload:payload andCallback:callback];
}


/**
 * Convenient logging method.
 * Messages will not be forwarded to console when self.peak.debug == NO
 * @param message
 * @param tag
 */
- (void)debugLog:(NSString *)formatString, ... {
    if (self.debug) {
        va_list args;
        va_start(args, formatString);
        [self.peak debugLog:[[NSString alloc] initWithFormat:formatString arguments:args] withTag:[self loggingTag]];
        va_end(args);
    }
}

/**
 * Convenient logging method.
 * Messages will not be forwarded to console when self.peak.debug == NO
 * @param message
 * @param tag
 */
- (void)debugError:(NSString *)formatString, ... {
    if (self.debug) {
        va_list args;
        va_start(args, formatString);
        [self.peak debugError:[[NSString alloc] initWithFormat:formatString arguments:args] withTag:[self loggingTag]];
        va_end(args);
    }
}

/**
 * Returns a logging tag for the PeakCore Module. F.ex. 'peak-core-userland (0.1.8)'
 * @return
 */
- (NSString *)loggingTag {
    return [NSString stringWithFormat:@"%@ (%@)", self.name, self.version];
}

- (BOOL)debug {
    return self.peak.debug;
}

@end