//
// Created by Robin Reiter on 14.06.16.
// Copyright (c) 2016 Robin Reiter. All rights reserved.
//

#import "PeakWebViewContainer.h"
#import "PeakCore.h"


@implementation PeakWebViewContainer {
    WKWebView *_webView;
}

- (WKWebView *)generateWKWebViewWithPeakCore:(PeakCore *)core {
    _webView = [[WKWebView alloc] initWithFrame:self.bounds configuration:core.webViewConfiguration];
    core.webView = _webView;
    [self addSubview:_webView];
    return _webView;
}

- (void)layoutSubviews {
    [super layoutSubviews];
    _webView.frame = self.bounds;
}


@end