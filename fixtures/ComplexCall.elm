module ComplexCall exposing (Asset(..), asset, main)


type Asset
    = ComplexCallAsset String


asset =
    ComplexCallAsset ("elm_logo" ++ ".svg")


main : Program () Asset msg
main =
    Platform.worker
        { init = \_ -> ( asset, Cmd.none )
        , update = \_ m -> ( m, Cmd.none )
        , subscriptions = always Sub.none
        }
