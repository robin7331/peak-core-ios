//
// Created by Robin Reiter on 14.06.16.
// Copyright (c) 2016 Robin Reiter. All rights reserved.
//

#import "PeakWebViewContainer.h"
#import "PeakCore.h"


@interface PeakWebViewContainer () <UIGestureRecognizerDelegate>
@end

@implementation PeakWebViewContainer {
    WKWebView *_webView;
}

- (WKWebView *)generateWKWebViewWithPeakCore:(PeakCore *)core {
    _webView = [[WKWebView alloc] initWithFrame:self.bounds configuration:core.webViewConfiguration];
    core.webView = _webView;
    [self addSubview:_webView];

    if (core.debug) {
        UILongPressGestureRecognizer *debugPressRecognizer = [[UILongPressGestureRecognizer alloc] initWithTarget:self action:@selector(debugTapped:)];
        debugPressRecognizer.numberOfTouchesRequired = 2;
        debugPressRecognizer.minimumPressDuration = 2.0f;
        debugPressRecognizer.delegate = self;

        [self addGestureRecognizer:debugPressRecognizer];
    }

    return _webView;
}

-(void)debugTapped:(UILongPressGestureRecognizer *)recognizer {
    if (_webView) {
        [_webView reload];
    }
}

- (void)layoutSubviews {
    [super layoutSubviews];
    _webView.frame = self.bounds;
}


@end