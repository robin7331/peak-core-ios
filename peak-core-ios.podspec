#
# Be sure to run `pod lib lint peak-core-ios.podspec' to ensure this is a
# valid spec before submitting.
#
# Any lines starting with a # are optional, but their use is encouraged
# To learn more about a Podspec see http://guides.cocoapods.org/syntax/podspec.html
#

Pod::Spec.new do |s|
  s.name             = 'peak-core-ios'
  s.version          = '0.5'
  s.summary          = 'Peak Core iOS Library'

# This description is used to generate tags and improve search results.
#   * Think: What does it do? Why did you write it? What is the focus?
#   * Try to keep it short, snappy and to the point.
#   * Write the description between the DESC delimiters below.
#   * Finally, don't worry about the indent, CocoaPods strips it!

  s.description      = <<-DESC
TODO: Add long description of the pod here.
                       DESC

  s.homepage         = 'https://github.com/robin7331/peak-core-ios'
  # s.screenshots     = 'www.example.com/screenshots_1', 'www.example.com/screenshots_2'
  s.license          = { :type => 'MIT', :file => 'LICENSE' }
  s.author           = { 'Robin Reiter' => 'robin7331@gmail.com' }
  s.source           = { :git => 'https://github.com/robin7331/peak-core-ios.git', :tag => s.version.to_s }
  s.social_media_url = 'https://twitter.com/robin7331'

  s.ios.deployment_target = '9.0'

  s.source_files = 'peak-core-ios/Classes/**/*'

  # s.resource_bundles = {
  #   'peak-core-ios' => ['peak-core-ios/Assets/*.png']
  # }

  # s.public_header_files = 'Pod/Classes/**/*.h'
   s.frameworks = 'UIKit', 'WebKit'
   s.dependency 'UICKeyChainStore', '~> 2.1.0'
   s.dependency 'JSCoreBom', '~> 1.1.1'
end
