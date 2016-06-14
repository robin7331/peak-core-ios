//
// Created by Robin Reiter on 14.06.16.
// Copyright (c) 2016 Robin Reiter. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>

@class PeakCore;

@interface PeakWebViewContainer : UIView
- (WKWebView *)generateWKWebViewWithPeakCore:(PeakCore *)core;
@end