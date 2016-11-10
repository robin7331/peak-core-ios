//
// Created by Robin Reiter on 10.11.16.
//

#import <Foundation/Foundation.h>


@interface PeakSharedStore : NSObject
+ (PeakSharedStore *)instance;

- (void)setSharedValue:(NSDictionary *)data;
- (NSString *)getSharedValue:(NSString *)key;


@end