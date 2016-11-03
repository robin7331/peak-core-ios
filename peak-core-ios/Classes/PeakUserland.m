//
// Created by Robin Reiter on 14.06.16.
// Copyright (c) 2016 Robin Reiter. All rights reserved.
//

#import "PeakUserland.h"


@implementation PeakUserland

- (void)onBeforeInstallation {
    [super onBeforeInstallation];

    self.version = @"1.0.0";
    self.name = @"peak-userland-ios";
    self.namespace = @"peakUserland";
}

- (id)targetForNativeCall {
    if (self.target)
        return self.target;
    return nil;
}


@end