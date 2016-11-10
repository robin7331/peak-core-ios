//
// Created by Robin Reiter on 10.11.16.
//

#import "PeakSharedStore.h"

@interface PeakSharedStore()
@property NSMutableDictionary *store;
@end

@implementation PeakSharedStore {

}
+ (PeakSharedStore *)instance {
    static PeakSharedStore *_instance = nil;

    @synchronized (self) {
        if (_instance == nil) {
            _instance = [[self alloc] init];
            _instance.store = [[NSMutableDictionary alloc] init];

        }
    }

    return _instance;
}

- (void)setSharedValue:(NSDictionary *)data {
    self.store[data[@"key"]] = data[@"value"];
}

- (NSString *)getSharedValue:(NSString *)key  {
    return self.store[key];
}
@end