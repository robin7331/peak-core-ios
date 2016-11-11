//
//  ViewController.m
//  Vue-Plugin-1
//
//  Created by Robin Reiter on 28.04.16.
//  Copyright © 2016 Robin Reiter. All rights reserved.
//


#import "PeakViewController.h"

#import <peak_core_ios/PeakCore.h>
#import <peak_core_ios/PeakUserland.h>

@interface PeakViewController ()

@property WKWebView *webView;
@property PeakUserland *userland;
@property IBOutlet PeakWebViewContainer *peakWebView;
@property PeakCore *core;
@end

@implementation PeakViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    self.automaticallyAdjustsScrollViewInsets = NO;

    self.core = [[PeakCore alloc] initForLogicModule];
    self.core.localDevelopmentIPAdress = @"http://192.168.188.22:3000/";
    self.core.loadingMode = PeakCoreLoadingModeLocalIP;

//    self.webView = [self.peakWebView generateWKWebViewWithPeakCore:core];

    self.userland = [self.core useModule:[PeakUserland class]];
    self.userland.target = self;

//    [self.core loadPeakComponentWithName:@"sample-logic-module" withCompletion:^{
////        [self.userland callJSFunctionName:@"sort" withPayload:@[@(1), @(5), @(3)] andCallback:^(id callbackPayload) {
////            NSLog(@"Callback: %@", callbackPayload);
////        }];
//
////        [self.userland callJSFunctionName:@"startHomeConnect" withPayload:@[@(1), @(5), @(3)] andCallback:^(id callbackPayload) {
////            NSLog(@"Callback: %@", callbackPayload);
////        }];
//    }];

}


- (IBAction)reloadComponent:(id)sender {

    [self.core loadPeakComponentWithName:@"sample-logic-module" withCompletion:^{
//        [self.userland callJSFunctionName:@"sort" withPayload:@[@(1), @(5), @(3)] andCallback:^(id callbackPayload) {
//            NSLog(@"Callback: %@", callbackPayload);
//        }];

//        [self.core set:@"Hallo" forKey:@"MyKey"];


//
//        NSLog(@"Secure Value: %@", [self.core getValueForKey:@"secure-token"]);
//        NSLog(@"Standard Value: %@", [self.core getValueForKey:@"some-persistent-value-2"]);

    }];

//    [self.userland callJSFunctionName:@"clear"];

}

- (void)displayLoginPage:(NSString *)authURL withCallback:(PeakCoreCallback)callback {
    callback(@"1231245");
}

- (void)closeLoginPageWithCallback:(PeakCoreCallback)callback {
    callback(@"Finished");
}


- (void)didReceiveMemoryWarning {
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

@end
