module VariableCall exposing (Asset(..), AssetKind(..), asset, main)


type Asset
    = VariableCallAsset String


type AssetKind
    = Star
    | Moon


asset kind =
    let
        filename =
            case kind of
                Star ->
                    "star.png"

                Moon ->
                    "moon.png"
    in
    VariableCallAsset filename


main : Program () ( Asset, Asset ) msg
main =
    Platform.worker
        { init = \_ -> ( ( asset Star, asset Moon ), Cmd.none )
        , update = \_ m -> ( m, Cmd.none )
        , subscriptions = always Sub.none
        }
