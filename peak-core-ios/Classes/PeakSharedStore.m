//
// Created by Robin Reiter on 10.11.16.
//

#import "PeakSharedStore.h"
#import "UICKeyChainStore.h"
#import "PeakCore.h"

@interface PeakSharedStore()
@property NSMutableDictionary *store;
@property UICKeyChainStore *keychainStore;
@property NSMutableArray *valueChangedEventHandlers;
@end

@implementation PeakSharedStore

+ (PeakSharedStore *)instance {
    static PeakSharedStore *_instance = nil;


    @synchronized (self) {
        if (_instance == nil) {
            _instance = [[self alloc] init];
            _instance.store = [[_instance getPersistentStore] mutableCopy];
            _instance.valueChangedEventHandlers = [NSMutableArray new];

            NSString *bundleIdentifier = [[NSBundle mainBundle] bundleIdentifier];
            _instance.keychainStore = [UICKeyChainStore keyChainStoreWithService:bundleIdentifier];

            [_instance.store addEntriesFromDictionary:[_instance generateStoreDictionaryFromKeyStore:_instance.keychainStore]];

        }
    }

    return _instance;
}

- (void)addValueChangedHandler:(PeakCore *)peakCoreInstance {
    if (![self.valueChangedEventHandlers containsObject:peakCoreInstance]) {
        [self.valueChangedEventHandlers addObject:peakCoreInstance];
    }
}

- (void)removeValueChangedHandler:(PeakCore *)peakCoreInstance {
    if (![self.valueChangedEventHandlers containsObject:peakCoreInstance]) {
        [self.valueChangedEventHandlers removeObject:peakCoreInstance];
    }
}


- (NSDictionary *)getStore {
    return self.store;
}

- (NSString *)getSharedValue:(NSString *)key  {
    return self.store[key];
}

- (void)setSharedValue:(NSDictionary *)data fromSender:(PeakCore *)sender {
    self.store[data[@"key"]] = data[@"value"];

    for (PeakCore *coreHandler in self.valueChangedEventHandlers) {
        if (coreHandler == sender)
            continue;
        [coreHandler onChangedStorePayload:data];
    }
}

- (void)setSharedPersistentValue:(NSDictionary *)data fromSender:(PeakCore *)sender {

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

    for (PeakCore *coreHandler in self.valueChangedEventHandlers) {
        if (coreHandler == sender)
            continue;
        [coreHandler onChangedStorePayload:data];
    }
}

- (NSDictionary *)getPersistentStore {
    return ([[NSUserDefaults standardUserDefaults] objectForKey:@"PeakCorePersistentStore"]) ?: @{};
}


- (NSDictionary *)generateStoreDictionaryFromKeyStore:(UICKeyChainStore *)store {
    NSMutableDictionary *temp = [@{} mutableCopy];
    for (NSString *key in store.allKeys) {
        temp[key] = [store stringForKey:key];
    }
    return temp;
}


@end