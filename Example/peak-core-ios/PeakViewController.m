//
//  ViewController.m
//  Vue-Plugin-1
//
//  Created by Robin Reiter on 28.04.16.
//  Copyright © 2016 Robin Reiter. All rights reserved.
//

#import "PeakViewController.h"

#import "PeakCore.h"
#import "PeakModule.h"
#import "PeakUserland.h"
#import "PeakWebViewContainer.h"

@interface PeakViewController ()

@property WKWebView *webView;
@property PeakUserland *userland;
@property IBOutlet PeakWebViewContainer *peakWebView;
@end

@implementation PeakViewController

- (void)viewDidLoad {
    [super viewDidLoad];

    PeakCore *core = [[PeakCore alloc] init];
    self.webView = [self.peakWebView generateWKWebViewWithPeakCore:core];
    [self.webView loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:@"http://localhost:3000/"]]];

    self.userland = [core useModule:[PeakUserland class]];
    self.userland.target = self;

}

- (IBAction)reloadWebView:(id)sender {

    //    [self.webView evaluateJavaScript:@"Vue.NativeInterface.callJS('helloWorld');" completionHandler:nil];

    [self.webView loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:@"http://192.168.0.14:3000/"]]];
}

- (void)openURL:(NSString *)url {
    [[UIApplication sharedApplication] openURL:[[NSURL alloc] initWithString:url]];
}


- (IBAction)clear:(id)sender {

    [self.userland callJSFunctionName:@"clear"];

}

- (IBAction)getCurrentResult:(id)sender {

    [self.userland callJSFunctionName:@"getCurrentResult" withCallback:^(id callbackPayload) {
        NSLog(@"Current Result: %@", callbackPayload);
    }];

}

-(void)storeResult:(NSNumber *)result {
    [[NSUserDefaults standardUserDefaults] setObject:result forKey:@"result"];
    [[NSUserDefaults standardUserDefaults] synchronize];
}

- (void)getLastResultWithCallback:(PeakCoreCallback)callback {
    NSNumber *result = [[NSUserDefaults standardUserDefaults] objectForKey:@"result"];
    callback(result);
}


- (void)didReceiveMemoryWarning {
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

@end
