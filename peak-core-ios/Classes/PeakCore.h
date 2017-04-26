//
// Created by Robin Reiter on 09.05.16.
// Copyright (c) 2016 Robin Reiter. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <WebKit/WebKit.h>
#import <JavaScriptCore/JavaScriptCore.h>

#import "PeakModule.h"
#import "PeakWebViewContainer.h"

@class PeakModule;

typedef NS_ENUM(NSInteger, PeakCoreLoadingMode) {
    PeakCoreLoadingModeBundle,
    PeakCoreLoadingModeLocalIP
};

typedef void (^PeakCoreCallback)(id callbackPayload);
typedef void (^PeakCoreOnReadyCallback)(void);

@interface PeakCore : NSObject

@property WKWebView *webView;
@property (nonatomic, readonly) WKWebViewConfiguration *webViewConfiguration;
@property (readonly) NSString *componentName;
@property NSMutableDictionary <NSString *, PeakModule *> *modules;
@property NSString *localDevelopmentIPAdress;
@property PeakCoreLoadingMode loadingMode;
@property BOOL debug;
@property BOOL fadeInOnReady;
@property NSTimeInterval fadeInDuration;


- (instancetype)initForLogicModule;

- (void)loadPeakComponentWithName:(NSString *)name;
- (void)loadPeakComponentWithName:(NSString *)name withCompletion:(PeakCoreOnReadyCallback)callback;

- (id)useModule:(Class)moduleClass;

- (void)set:(NSString *)value forKey:(NSString *)key;
- (void)setPersistent:(NSString *)value forKey:(NSString *)key;
- (void)setPersistentSecure:(NSString *)value forKey:(NSString *)key;
- (void)delete:(NSString *)key;
- (void)deletePersistent:(NSString *)key;
- (void)deletePersistentSecure:(NSString *)key;


- (void)onChangedStorePayload:(NSDictionary *)payload;
- (void)onDeletedStoreValue:(NSString *)key;

- (NSString *)getValueForKey:(NSString *)key;

- (void)debugLog:(NSString *)message withTag:(NSString *)tag;
- (void)debugError:(NSString *)message withTag:(NSString *)tag;

- (void)callJSFunctionName:(NSString *)functionName inNamespace:(NSString *)namespace;
- (void)callJSFunctionName:(NSString *)functionName inNamespace:(NSString *)namespace withPayload:(id)payload;
- (void)callJSFunctionName:(NSString *)functionName inNamespace:(NSString *)namespace withCallback:(PeakCoreCallback)callback;
- (void)callJSFunctionName:(NSString *)functionName inNamespace:(NSString *)namespace withPayload:(id)payload andCallback:(PeakCoreCallback)callback;
@end
