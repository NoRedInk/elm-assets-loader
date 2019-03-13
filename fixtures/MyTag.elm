module MyTag exposing (Asset(..), main, myAsset, otherTagAsset)

import OtherTag


type Asset
    = Asset String


otherTagAsset =
    OtherTag.Asset "dont_touch_me.png"


myAsset =
    Asset "elm_logo.svg"


main : Program () ( Asset, OtherTag.Asset ) msg
main =
    Platform.worker { init = \_ -> ( ( myAsset, otherTagAsset ), Cmd.none ), update = \_ m -> ( m, Cmd.none ), subscriptions = always Sub.none }
