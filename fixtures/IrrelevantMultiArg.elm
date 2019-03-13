module IrrelevantMultiArg exposing (Asset(..), complexAsset, main, partialAsset, simpleAsset)


type Asset
    = AssetPair String String
    | AssetPath String


complexAsset =
    AssetPair "elm_logo.svg" "elm_logo.svg"


partialAsset =
    AssetPair "elm_logo.svg"


simpleAsset =
    AssetPath "elm_logo.svg"


main : Program () ( Asset, Asset, Asset ) msg
main =
    Platform.worker
        { init = \_ -> ( ( complexAsset, partialAsset "elm_logo.svg", simpleAsset ), Cmd.none )
        , update = \_ m -> ( m, Cmd.none )
        , subscriptions = always Sub.none
        }
