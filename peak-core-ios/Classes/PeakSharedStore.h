//
// Created by Robin Reiter on 10.11.16.
//

#import <Foundation/Foundation.h>

@class PeakCore;


@interface PeakSharedStore : NSObject
+ (PeakSharedStore *)instance;

- (void)addValueChangedHandler:(PeakCore *)peakCoreInstance;
- (void)removeValueChangedHandler:(PeakCore *)peakCoreInstance;

- (NSDictionary *)getStore;
- (NSString *)getSharedValue:(NSString *)key;
- (void)setSharedValue:(NSDictionary *)data fromSender:(PeakCore *)sender;
- (void)setSharedPersistentValue:(NSDictionary *)data fromSender:(PeakCore *)sender;
- (void)deleteSharedValue:(NSString *)key fromSender:(PeakCore *)sender;
- (void)deleteSharedPersistentValue:(NSDictionary *)data fromSender:(PeakCore *)sender;

@end