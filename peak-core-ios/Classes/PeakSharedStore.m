//
// Created by Robin Reiter on 10.11.16.
//

#import "PeakSharedStore.h"
#import "UICKeyChainStore.h"

@interface PeakSharedStore()
@property NSMutableDictionary *store;
@property UICKeyChainStore *keychainStore;
@end

@implementation PeakSharedStore {

}
+ (PeakSharedStore *)instance {
    static PeakSharedStore *_instance = nil;

    @synchronized (self) {
        if (_instance == nil) {
            _instance = [[self alloc] init];
            _instance.store = [[_instance getPersistentStore] mutableCopy];

            NSString *bundleIdentifier = [[NSBundle mainBundle] bundleIdentifier];
            _instance.keychainStore = [UICKeyChainStore keyChainStoreWithService:bundleIdentifier];

            [_instance.store addEntriesFromDictionary:[_instance generateStoreDictionaryFromKeyStore:_instance.keychainStore]];

        }
    }

    return _instance;
}

- (NSDictionary *)getStore {
    return self.store;
}

- (void)setSharedValue:(NSDictionary *)data {
    self.store[data[@"key"]] = data[@"value"];
}

- (void)setSharedPersistentValue:(NSDictionary *)data {

    self.store[data[@"key"]] = data[@"value"];

    BOOL secure = [data[@"secure"] boolValue];
    if (secure) {

        NSError *error;
        [self.keychainStore setString:data[@"value"] forKey:data[@"key"] error:&error];
        if (error) {
            NSLog(@"%@", error);
        }

    } else {
        NSMutableDictionary *persistentStore = [[self getPersistentStore] mutableCopy];
        persistentStore[data[@"key"]] = data[@"value"];

        [[NSUserDefaults standardUserDefaults] setObject:persistentStore forKey:@"PeakCorePersistentStore"];
        [[NSUserDefaults standardUserDefaults] synchronize];
    }

}

- (NSDictionary *)getPersistentStore {
    return ([[NSUserDefaults standardUserDefaults] objectForKey:@"PeakCorePersistentStore"]) ?: @{};
}

- (NSString *)getSharedValue:(NSString *)key  {

    return self.store[key];
}

- (NSDictionary *)generateStoreDictionaryFromKeyStore:(UICKeyChainStore *)store {
    NSMutableDictionary *temp = [@{} mutableCopy];
    for (NSString *key in store.allKeys) {
        temp[key] = [store stringForKey:key];
    }
    return temp;
}


@end