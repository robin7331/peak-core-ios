//
// Created by Robin Reiter on 09.05.16.
// Copyright (c) 2016 Robin Reiter. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <WebKit/WebKit.h>

#import "PeakModule.h"
#import "PeakWebViewContainer.h"

@class PeakModule;

typedef void (^PeakCoreCallback)(id callbackPayload);
typedef void (^PeakCoreOnReadyCallback)(void);

@interface PeakCore : NSObject

@property WKWebView *webView;
@property (nonatomic, readonly) WKWebViewConfiguration *webViewConfiguration;
@property (readonly) NSString *componentName;
@property NSMutableDictionary <NSString *, PeakModule *> *modules;


- (void)loadPeakComponentWithName:(NSString *)name;
- (void)loadPeakComponentWithName:(NSString *)name withCompletion:(PeakCoreOnReadyCallback)callback;

- (void)loadPeakComponentWithURL:(NSURL *)url;
- (void)loadPeakComponentWithURL:(NSURL *)url withCompletion:(PeakCoreOnReadyCallback)callback;

- (id)useModule:(Class)moduleClass;

- (void)callJSFunctionName:(NSString *)functionName inNamespace:(NSString *)namespace;
- (void)callJSFunctionName:(NSString *)functionName inNamespace:(NSString *)namespace withPayload:(id)payload;
- (void)callJSFunctionName:(NSString *)functionName inNamespace:(NSString *)namespace withCallback:(PeakCoreCallback)callback;
- (void)callJSFunctionName:(NSString *)functionName inNamespace:(NSString *)namespace withPayload:(id)payload andCallback:(PeakCoreCallback)callback;
@end
