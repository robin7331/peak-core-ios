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
@property IBOutlet UITextField *keyField;
@property IBOutlet UITextField *valueField;
@property PeakCore *core;
@end

@implementation PeakViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    self.automaticallyAdjustsScrollViewInsets = NO;

    self.core = [[PeakCore alloc] initForLogicModule];
    self.core.localDevelopmentIPAdress = @"http://192.168.188.22:3000/";
    self.core.loadingMode = PeakCoreLoadingModeLocalIP;
    self.core.debug = YES;

//    self.webView = [self.peakWebView generateWKWebViewWithPeakCore:core];

    self.userland = [self.core useModule:[PeakUserland class]];
    self.userland.target = self;

    [self.core loadPeakComponentWithName:@"sample-logic-module" withCompletion:^{

//        [self.core set:@"Gay" forKey:@"Test123"];
//        [self.userland callJSFunctionName:@"sort" withPayload:@[@(1), @(5), @(3)] andCallback:^(id callbackPayload) {
//            NSLog(@"Callback: %@", callbackPayload);
//        }];

//        [self.userland callJSFunctionName:@"startHomeConnect" withPayload:@[@(1), @(5), @(3)] andCallback:^(id callbackPayload) {
//            NSLog(@"Callback: %@", callbackPayload);
//        }];
    }];

}


- (IBAction)callJSMethod:(id)sender {

//    NSLog(@"Test123 is at %@", [self.core getValueForKey:@"Test123"]);

    [self.userland callJSFunctionName:@"deleteStoreValue" withPayload:self.keyField.text];

//    [self.core loadPeakComponentWithName:@"sample-logic-module" withCompletion:^{
////        [self.userland callJSFunctionName:@"sort" withPayload:@[@(1), @(5), @(3)] andCallback:^(id callbackPayload) {
////            NSLog(@"Callback: %@", callbackPayload);
////        }];
//
////        [self.core set:@"Hallo" forKey:@"MyKey"];
//
//        [self.userland callJSFunctionName:@"debugModeTest"];
////
////        NSLog(@"Secure Value: %@", [self.core getValueForKey:@"secure-token"]);
////        NSLog(@"Standard Value: %@", [self.core getValueForKey:@"some-persistent-value-2"]);
//
//    }];

//    [self.userland callJSFunctionName:@"clear"];


}

- (IBAction)deleteStore:(id)sender {
//    [self.core delete:@"Test123"];
//    [self.core delete:@"Test123"];
}

- (IBAction)set:(id)sender {
    [self.core set:self.valueField.text forKey:self.keyField.text];
    self.valueField.text = nil;
}

- (IBAction)setPersistent:(id)sender {
    [self.core setPersistent:self.valueField.text forKey:self.keyField.text];
    self.valueField.text = nil;

}

- (IBAction)setPersistentSecure:(id)sender {
    [self.core setPersistentSecure:self.valueField.text forKey:self.keyField.text];
    self.valueField.text = nil;

}

- (IBAction)del:(id)sender {
    [self.core delete:self.keyField.text];
}

- (IBAction)delPersistent:(id)sender {
    [self.core deletePersistent:self.keyField.text];
}

- (IBAction)delPersistentSecure:(id)sender {
    [self.core deletePersistentSecure:self.keyField.text];
}

- (IBAction)get:(id)sender {
    self.valueField.text = [self.core getValueForKey:self.keyField.text];
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
