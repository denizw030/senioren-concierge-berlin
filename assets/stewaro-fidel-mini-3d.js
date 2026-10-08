// STEWARO FIDEL MINI 3D LIVE RUNTIME v1
// Texture-driven facial animation for the verified FIDEL Mini body master.
// No floating eyelid geometry. No eye-mesh collapse. Body rig stays untouched.

const THREE_URL="https://esm.sh/three@0.180.0";
const GLTF_LOADER_URL="https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js?deps=three@0.180.0";
const EYE_RECT={x:950,y:780,w:200,h:210};
const MOUTH_RECT={x:1110,y:1000,w:90,h:120};
const PATCH_DATA={"eyeHalf":"data:image/webp;base64,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","eyeClosed":"data:image/webp;base64,UklGRpgFAABXRUJQVlA4IIwFAABwIgCdASrIANIAPjEYi0QiIaEQqkxMIAMEtLd+LZPuYexss9x1pOA+qgafEG/kH93yXH5Z/p+M/SXzJPGn9Q+wP/JP65/x+BNCt3NFDVAWDxuvvELQZW96B9xxED6Xsbj8jzuduE0zoKsjV/pxc8CNt0prKJEJcCxIdvy7VeQqkygsMazN2i9WR7bjaT+62bdwrzWVnBm29lA98isqAsSa7lb9vJQQf///kKGwouwb+l4xtcXYB0iH3fiVKwPaMQJbLYFCyihwdzmEmaVsCdgA8pmSYf/mo2RpMmxqYTXdl70vgp80ydWRGa+mf5liLbPtD3Q6gl5dhP2d9gd3mPCjMcogRsfU2BohbfP5m95yOJtmVfM/9MPnneZ6gAD++lOgn/X3lDsTIf9qflZ7v0yZaGBgnib4W1ouVuovrZPeQSBPtglA2ABhpruwKItnbk0YMBadTv/XBJGvy+kNlbFshGgUtw4nKVQZHBoD7IFl8U+RLEohwqrs0Dqjoh/iAdBDpPQs71zI6k3AWdJwjqgfSY08TtXdk7QfXxVjPjNUGc76TfkxgA3zgtI4FATtOp+G/UC4gICQ+bbDW068H8CGRnpweZi9z4FFtn7Ccg16mxCSA4DXjb81vp9jYwJlf69s7JnOliRV1MCrUJm/yxdpjk5Y6V4HsJz9x1fkmZ8Zpa6nTaolPBAXrcPcyowEascQWNtJvzTnQYJZP8T01TwA+7lEaf1GI8qefK3Ot2w2XuAkwO9pyjcmXknjS1cG/dHUuHkF5TDSkTUpPBEnkiEivMwyOmIGRXviL6+JqDCUdO4n4AliTdXsyJFWFmzLN9Ta/JeTZx6oaDvCtkgbfwBiVD3H/fR7u4aNEyzTnFnf7cHoVA+4Pd23YSFy67lil/DqmOHuMKILZ9z2tlljCpLWwORr7KwQtYK6r0o2VkPQusf9BhsnbRk3txF//ejILhEtJpgacHAcm/bmZ0kP5OUF/hPydc8AUvAK/cVEfGv0mY2o7ZDhoNioEgKWJgpvTkw7GKPGs81uoPqw0/OpvpitUo94HDyoRQNO6RT8ChN4706bf7tIUHjoJsT4ncXYCYv/9gBNa50e3wL+Xq2NH5xbsc1wZmqVZdpvLEW6OkIA9VZznP4nOcfoVYKnQFpXrUOlLjfVgifJbYFbYj8CBvett7DSqjPn7adeFAWxv+q1bGjBs/ZBtbtsW5KUtlHG7hu0ad6DiIaYzv72H3Kenc9dJxvigOQjkEBySfnrTb47wdFbYhl3nS4sjqhhSOX/RC750lv+hRJM3u98sRVF7jbjiPnp+MPPUb/Q0nkB4Aw90E0yrjBTJmquNVzUMJpBL99kr82EFGqCjZ+IjutYgpSE2NYLvfld5LyKkKfcDnz5ew4ovEp68k177ng3QjMUyywrQ34Hvq7fAsGCH7+dYLtbnwF/WFJLmOD7LVUfbl8dsCIQMX/XFruN4m+P8yBqzjxrzV3PJzKu2SC/+W6qxlZ1uh9T2T9miU3ZaJUo7aAnWu/LjYZbRv75nIZ6B9SATJ7cJFARMS1qIV+700YerpU+/vYdBZyBPMMAO+cJGH+jZi9KWCih4m2whMs60IGZKL5vEov3BformZx2pMbnnjam+hAyh8FmSqOnHAn4XPAKQtU/OjXzrhRe9w55nHz/h3wQmwgQMPjX2a6MexLFbYSHcCz+zB5WCDaZ5evumCSi/g2U35M22GZA3RXz7ZcgOmxD6qhlffQJH/Ggjo3fIp9oMZFsYBLHFAyGXhhz6odIzgbdx0EWeAWxtumLIxtoPUUOnr1W4xpKFZbVBmsuSqCymb8MXlgJpDvIjvbLMg5VWNX8sL9IIPQQMElDeqpBQMTKzgblYUcJqwTJRrp24yCDOiKjJjXBZsUSwAAA","mouthMbp":"data:image/webp;base64,UklGRhwEAABXRUJQVlA4IBAEAACQFQCdASpaAHgAPjEYikMiIaEVXASAIAMEs4BnGFxGquv24F3AT5n2u/2Gu9/xnDvtRf4rHmWvfG/57mcX6j/7HuC/yL+l/8LsHfsr7Fv7bkH+HIZWFl+C/8raGeTpLrDVEKo8uRGrGO/uzxlSca3xVKy+cQqjX9cadvp7396ahCediMbh1lEfU5+D5NxeG+qtkb1xVN+czfH/jzBB+iKbRy5OfvvjRWMm/hdxJTQ72fJZId4AAP75ni/4i3Z07Uv9qfUn1JRE+olscLfZN9uY4usDr0Y9Q8+RYcB+XZbDRNuqXhTMWVOJc4aQRbLbgIWXEtjxS9oBQ/WVwsYfp29Iw084s7qyhF6o5bOBJNgz85svtH+67K/bocG32LrDJmPYdJp8nQwCH9UTvfvbNo4KE9XDHUinKj3xha0/SoYAEVpO4d/MCVDvN9qDjB66JaWTkX8jxn4/44qk5NGd/eIm0ty0XfZxYdEs0LjZtyA2tmDL9CveAekVm71YmA6Ub0vhovywhz2Fv+jX/8RVxyRpMNqFjk6SqAesT20I7FAuxkD9KfkVYzk9z8u04Mem+TKu1dCcNOo7nYgTmjMFy1wXB4wDApXzx6Ri7TraHuD3Oknfdl3RUcSOfT8Cht+4U3e0ceB5uU2Te32P4DioZZWp4or2oOIYX1t9eaW41jpURIuuULzVZSCHszl/weQg/GLYZsXAKJyAIOClsVRmI6kCvNKTPrU6IAsMyimPRm8Fl8NV0lKyvUVstVNv+mFiqG71nKLM7bTRAVWT6+0Un5nPev9LOy6PL4mPDe4txZz4kh/lt8dYh71/7X1BFB0O9V/6pcJtuBn+xvkJxppqheAcGbb+AlqWhssgya4JZiPkm5Dd2v78KYJziX98upvJjhnYYg+FeabVoeN9y5KwIbySP+L1h97etO/w5/wf4hnUj4y93RfmBofXE2RGQTJafI+sHpQyD7dut1nRMaN+SkswAfQKxuStcNDp5uWuLoPpZjhzr14bIDB7y7jR37r2Ssk248XtkuZqT9XHnUYR+Vsi1K3vCh3jqu4c22P4k+PF4AGyo6a2tbQR2XPui0lkv+1WMr72gg7gN0lX7NyQn+8cUEBlQ0BA1Ax3hY7euurEboBuYb5YDBvMDghx6Gl8ER/H/s83eUdstIskMGttxKA6Bc5x7wHvNmsrpWG1PIg+jA/5AXI3hI+noLrittoipY7NfyJwIIgmRtvvIu4NhboWEHpkIvsrHUjiAL/ZWYMTU+W2/h9rk7Vy2ZNxkjTRzxkhp02b+L9nC38epnHka6DM8/Pfoy1z8CEUkxkrnaLAxULG/2budwz1El/Lsx0DliNKabpiputPXF2s89MgrvRP07YRwR1FyFWhpgsV+AAAAA==","mouthFf":"data:image/webp;base64,UklGRuIDAABXRUJQVlA4INYDAADQFQCdASpaAHgAPjEYiEMiIYquPiAQAYJZwDNuG3V18ziHnJdtvdy0f0/b68T/IZnzHgf6rTG8SDMV/uPnd/6nlc/KP8X7Av8m/qH/I9W72D/sd7J/7HEQjrXZG/7F9C65z+I4Ut6c4NQKbOFGhGvAleNknEEDvIeHnQO76tHwuIWAV7+9L16lyU2A/vUKMdsD0XNisvv8qWGZQauX8EH57luMcMNjbMXFvsFGl1v9IqtnyWU9zgAA/vmeL/X3O/AIZ/tT56+VgvRib7G7N6PZ+J3FSzLL0zJPaTVsKnz/jJgOtbDryUNQnmWG8EcTcAKhMzoFDoETWVCSUq8rR8mq4jrZ4QKcGjUJuiH4Na36d7MBRpgIVYvFYHc2lZz7oJtqZMH5pOaLf/ZcLyzfVVkuPTJGxEI9ERDaRPtOPQ5DyVVC54TrvDWLkf2KlUie+kjuDIZSD9lUR8ipV1OfC+MhlWgP/GGXI59f/XL0GqnnGZ5NUgqsjYRFZPpYajPpBZQP6MbW/Bg/BLIQppffPNjdTIorf+I5yVPN5E1un2xbIXYR/GexE97ux8X+d/TC/xaz6oIBG5Mk7YgXBeX95BSR1NwivB85LDUhy5OP/Vb/2bfgxomsL7jkoPZfuHBpRpzAmaJ3UJt995f4exB6Mo5lntDCCtPciRMw6Hsbx+fgh6CGApiUc+1cHvSV0jTt0dbC7ofYGDt/4rnJRiEom4P8NbIy1D8d6PWW57n/pY+yx8yOrMqMem92v0D7Bm8Ruy7+EXtfSnvrvG3qg83FaLeGQu7v2TO9ie8YNdGuMr5bG296UqS1IFyT9XGNbfvpSrxq/95om/wozZ5SQptxqkpWlbc8Kcix5XUELR+KC2ykQpl/tYtI36KWQLR09sZVSEMeTcVa6LOl8G5tfpQxn7dut1wq7aN+SmtQWcaqeJEMLvpbjy3tCMuf5jxhX7tMUpBj3Tts+JJ/di04w2FSH7R45tDnfs4OPr3mG7yNoSNipdyO3kIawJ2blhDUVZs/P+HDT6qaFaUub6r9qohvEGKygFcAC34fjz/rBOnlZj5Oj1ye6DY1d5p5xFprK3J2/vnU92ay84FnexSgbWzY0v9LKn/zW1ENgzQRvTBgwcgSxg8AUbqD9LVX+NCetiHt7b9jwmlQu6aW53RwIIgmRtvvF8+NhcZPEGwXHIqPMNOYcv9DoEP4BFPquV8h9iv9ir6llcc7kTkeobtSDn8YiY0Cy8sihKe5CLO6Lx718LC2/AyEJhCu9sKah6KOwTHquxH/l1Y6Gz7uqnu0xU3Wnri7WeemQZdRLuSygu6GSQZ7dsDdrEgA","mouthE":"data:image/webp;base64,UklGRoAEAABXRUJQVlA4IHQEAABQFwCdASpaAHgAPjEYikOiIaESugUYIAMEsoBmt6Act/Z7bgc8Bpym89V4V96rxv8Hw/+nTyTf4PJZfo2kM4cOPj1Sv6X/teWj6Y/6PuB/yL+o/8nsQ/sz7B/6oFAgf0TMsL/ri8zcuHkyIP3xMJwSotF5ACkzaNsKllS7Y4oWvGJxxKJpdsFD4vrUlTXT9DuKJWgyfFnN65Yio1xCdgtS7t7lPB4asHIYMcKa1gEzch3Ifmnz6BQ9iwStQSmR6H87rwAA/vr6l/iLp7wDUv/nb8QfqC7chGD1ZCS+4W00TnXLbkeSoye9Uu62+zc75Bbk+2B+T+eFywiE7nMmGP+kf8JfwwOcjI/yxIn5KHiMYMEw9rX49Bv/MZ2O0rP71665EaH/zCgexIITNBgpPBDixKo88qqyADxq0NhkvGm9FiWiH0U80Nb47RjQ6cpEP2Mb7V3x/Ps3/8S1h1q2v3/JMbGqKn+IWPgkbN9J3eVLQnFEQ1x66rCXO71ik2Ghg10kwijABt3811p/iUMt3qT/okQsaXjx6Of0qi0ZARe50FoEqimOKKqfKSU5j7PnkFQDkA+8LD3iIiESnxX/WSD6Sm/x78JDY2r6wUJpQSrsOzC3KR9oR7+39Gkdy9ezPH3vV+NgmACHAxkH+ApYUryVyOqhBF2AV/6hIzQNukkaIP36wTnM0A1lddYO7iaD4vsWLacSx1rEZKuEoIjx4qQPSTf2h7im0HSltXrx//PyAf5ZBqkWN5QG06tlbHveS7culbgPmgMrIB8VfZBg+P5sUJtltTqE7cuPIRNz4PB89i4PRP2RUf0lH/aw/tjEmvYHWpOIf386mG7Skc5SuZfEud0OhTYp2VyM+o1fliBKvLad9Qiw4HrNlTg+u7bmU0s3fxgiG6gBwl8yf3nfX5bHKu7g/F7Kp+PH/bQeB/2D0B3vPa8adyvfveFPz79jRWFKfvz3cpLSX79n5uS7g7mIqN6FVDRptQE6/DjFuk/H5Ad2Cchs/YkxXE++e8f0mLlEYyh00bv62ExNj1rHis/70d7GPOB2m1Quj3j0EjzQP7MVUTCeJJvdeGZqdOH1Dnmg1Yu1g/lp/+eTzc/bt1uwlVvWTydv9RqlubEv8zNVq0LIFUe9pp+1l4iUSuX8UqnnsigFxYJDf5bkZIdWaedl+dMNz2UsoUFlvoa3IHd2R2IUmaZYlb021MuPzkkhTPwxZY4dRMf9q3RQl+RyAi3ebhGDZnf3jigkTt2qehAJTjOlMBCbnCQ20uUETxA1ayf89HmdXI1rQkif33TLRePcvgsucZdcZj1qSKhDa84C5rtf9kp/qMYjh6Dqbts6v/9M3fRSlOONIfit4g6ZPpT+S9K2e/QrbcYusB8r1+q4pI0cIy/HOIU4oJ9PX6AEqQrfMAv8ZwYYrENQQg4kh38XFeARjQ4KIm3VAtU4nljgFHrTBaMh4NJGOxaxItg3N6jTKzQRo/JYOK9E7eQP0auoefHLbOeu19y4+b5NSenIIMSG0AA=","mouthOu":"data:image/webp;base64,UklGRu4DAABXRUJQVlA4IOIDAABwFQCdASpaAHgAPjEYiEMiIYsFjiIQAYJZwDKrIkOZdPtvruGn1XtR/vteV/fc41/gMagt7WY5/bfPK/yPLp9I+wJ/Jf6X/v/VA9gH65exF+zpFrO+JoGDO9MAzGeIlY0RlF1Btf0pzyid0ciVtQEieGKpAfLU0Fg4qWbGPLmJfwL87nFM8EOIyEhYhwjLclAyTrGtuOgEume6afzbWV5s+PM+i8kYaO6yBZpuh3s+SzSmwAAA/vmeL/X3O/AIZ/tT56+VgvRib7G7N6PZ+J3FSzLL0zJPaTVsKnz/jJgOtbDryUNQnmWG8EcTcAKhMzoFDoETWVCSUq8rR8mq4jrZ4QKcGjUJuiH4Na36d7MBRpgIVYvFYHc2lZz7oJtqZMH5pOaLf/ZcLyzfVVkuPTJGxEI9ERDaRPtOPQ5DyVVC54TrvDWLkf2KlUie+kjuDIZSD9lUR8ipV1OfC+MhlWgP/GGXI59f/XL0GqnnGZ5NUgqsjYRFZPpYajPpBZQP6MbW/Bg/BLIQppffPNjdTIorf+I5yVPN5E1un2xbIXYR/GexE97ux8X+d/TC/xaz6oIBG5Mk7YgXBeX95BSR1NwivB85LDUhy5OP/Vb/2bfgxomsL7jkoPZfuHBpRpzAmaJ3UJt995f4exB6Mo5lntDCCtPciRMw6Hsbx+fgh6CGApiUc+1cHvSV0jTt0dbC7ofYGDt/4rnJRiEom4P8NbIy1D8d6PWW57n/pY+yx8yOrMqMem92v0D7Bm8Ruy7+EXtfSnvrvG3qg83FaLeGQu7v2TO9ie8YNdGuMr5bG296UqS1IFyT9XGNbfvpSrxq/95om/wozZ5SQptxqkpWlbc8Kcix5XUELR+KC2ykQpl/tYtI36KWQLR09sZVSEMeTcVa6LOl8G5tfpQxn7dut1wq7aN+SmtQWcaqeJEMLvpbjy3tCMuf5jxhX7tMUpBj3Tts+JJ/di04w2FSH7R45tDnfs4OPr3mG7yNoSNipdyO3kIawJ2blhDUVZs/P+HDT6qaFaUub6r9qohvEGKygFcAC34fjz/rBOnlZj5Oj1ye6DY1d5p5xFprK3J2/vnU92ay84FnexSgbWzY0v9LKn/zW1ENgzQRvTBgwcgSxg8AUbqD9LVX+NCetiHt7b9jwmlQu6aW53RwIIgmRtvvF8+NhcZPEGwXHIqPMNOYcv9DoEP4BFPquV8h9iv9ir6llcc7kTkeobtSDn8YiY0Cy8sihKe5CLO6Lx718LC2/AyEJhCu9sKah6KOwTHquxH/l1Y6Gz7uqnu0xU3Wnri7WeemQZdRLuSygu6GSQZ7dsDdrEgA","mouthAa":"data:image/webp;base64,UklGRsAEAABXRUJQVlA4ILQEAAAwGACdASpaAHgAPjEWiUMiISEXWuwAIAMEsoBlGkeJtNGIQhV25fmPx57edq8u/EV5H+Nzkv9r3yrJlsnxu+e5/ufcB7jPp7/u+4T/Jv6d/uuwf+unsYfs6WQTOq1L9dZ+xVF6Mhq5tlPZn/Ytn8hULHW0DjLX9N0tx2yr0vrkL9TSoM+3oHtFEIfjwRXj6+AeNMPdqHB455yF0Em6nTjUshxPTdOl9wXZZNU349p0WREnKwdHPMXlbMHIsL6MFG6u6RsAAqG+Y8MAAP76PMvr1FEnCv/M3YrnahYHm/igY39wkXyiqO804fENnWk3/iLpb5dotMUQ0NCHkpdDEgr4QPJ0XhF0tO57TYwn6vcLgpdsYdP3auHkf7/xZ3ZUsm7hHlkq2+z5T8XvjNWw+9YWlb9Jq05tm63iNVoi/3vyq66Pok6t56+GtxJ4JMvXaK1dnNxTgw/V01WgNLbwB9OQqHOvVUKJLXubPEfmQjknnpL0whMLfI9reTzR3FLk005U9M6/r8uDcOX5KcoruIo4COpuN719pKs3dINKbids2o0rdhTYm4A+o+wOK85uON6cn4g/7i8p5zVxofINDV3RysTNJ9kccIVnNZl9wSCylgC6L6luyuGSEH05toe8wWTPiems4k6kiE8UcOwCRSoFT/H/oHCu65ODWienD1WrbBkZWwvPp4iuTVXivFzxeewPDkduexmXvLmnsL8KvYLc4hod/gyTkYCeAZAR726C6lf8x7fs1x3bVF+n53mPny+TkJg+D1hOSPplea7eXs/JqcFyFqeilsfFxGpsg1F5A33V8IXZKwqyppgar7ZIDzuRFBfPDAlOXRBsfe1szwUb8LN1qfJ60BuUD17Ub9c88wkBZjuZPw+1iTdfAjw/yoiH0YDs2qmAvne+dA37Vh2ayocJm5ZoKXu31P/+V9v+St1/XBfunrMTUL79dWwqYIjdlqG6A/MJaELmdMJEeiDVyWxm3iGfeNBpLlDA2MzGlX+toZgSp2fys/+FcYc/p0xQUgi0p63uo12BDP37Y3oYeFyshnaX/8jOuA8Hk0KDln0Ko20aPokRn1RJmXDMmSSJEnNnS4z/bXvynj+PIwc+AMK0ucjwpBbw/54kiARxIi4OdNu5cYNh4yazYdT/07ov2HzK/+8JMhW8MBmEHiIGA9q/7evGZa0dCir3n93ZP0GjfhK1PZCLW7J+W9DBVjRPFnq/7szpL9EwMYYqDINdRW2jv84N2pL1FDBAAA1bRPujX9nw3r9VxL6v+xqS4cDepj4hsnGrKIG0CcVZUdnh/7/XmA421ViYuKunMKd0ZUqo0yB3944Quy1xYWcUQOF8zJ6UDpY+TkdfSxM4QMP1h+xOe5rks0NY2wST/IEGChzRDPXjY284xA4wWwYXkyOprP55P/Yzx5TJKrdB4leqRjnKw6o0bJx7ijS9b/iyBg1m/IXVPffgfsHsCze6Aj/mph6J5Q/4xj8i3PKu3zOqgNDmkk0KV9neLnl0bjH/1SNcEW8pO/MNpekNfD2y8sU2M3bhIR2JMsMW7t4QiN7u5palZpugUBXidyXFz1xdOq/D+d4fezS2Ub0qDZv215WZnAAA"};

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const rand=(a,b)=>a+Math.random()*(b-a);
const loadImage=(src)=>new Promise((resolve,reject)=>{
  const img=new Image();
  img.decoding="async";
  img.onload=()=>resolve(img);
  img.onerror=()=>reject(new Error("FIDEL_PATCH_LOAD_FAILED"));
  img.src=src;
});

async function loadPatches(){
  const e=Object.entries(PATCH_DATA);
  const imgs=await Promise.all(e.map(([,src])=>loadImage(src)));
  return Object.fromEntries(e.map(([k],i)=>[k,imgs[i]]));
}

class FaceTextureController {
  constructor(THREE,sourceMap,patches){
    const image=sourceMap?.image;
    const width=image?.width||image?.videoWidth||2048;
    const height=image?.height||image?.videoHeight||2048;
    this.patches=patches;
    this.canvas=document.createElement("canvas");
    this.canvas.width=width; this.canvas.height=height;
    this.ctx=this.canvas.getContext("2d",{alpha:false});
    this.ctx.drawImage(image,0,0,width,height);
    this.base=document.createElement("canvas");
    this.base.width=width;this.base.height=height;
    this.base.getContext("2d",{alpha:false}).drawImage(this.canvas,0,0);
    this.texture=new THREE.CanvasTexture(this.canvas);
    this.texture.flipY=false;
    this.texture.colorSpace=THREE.SRGBColorSpace;
    this.texture.wrapS=sourceMap.wrapS;this.texture.wrapT=sourceMap.wrapT;
    this.texture.minFilter=sourceMap.minFilter;this.texture.magFilter=sourceMap.magFilter;
    this.eye="open";this.mouth="neutral";
  }
  restore(r){this.ctx.drawImage(this.base,r.x,r.y,r.w,r.h,r.x,r.y,r.w,r.h);}
  setEye(state){
    if(state===this.eye)return;
    this.restore(EYE_RECT);
    const patch=state==="half"?this.patches.eyeHalf:state==="closed"?this.patches.eyeClosed:null;
    if(patch)this.ctx.drawImage(patch,EYE_RECT.x,EYE_RECT.y,EYE_RECT.w,EYE_RECT.h);
    this.eye=state;this.texture.needsUpdate=true;
  }
  setMouth(state){
    if(state===this.mouth)return;
    this.restore(MOUTH_RECT);
    const map={
      mbp:this.patches.mouthMbp,ff:this.patches.mouthFf,e:this.patches.mouthE,
      ou:this.patches.mouthOu,aa:this.patches.mouthAa
    };
    if(map[state])this.ctx.drawImage(map[state],MOUTH_RECT.x,MOUTH_RECT.y,MOUTH_RECT.w,MOUTH_RECT.h);
    this.mouth=state;this.texture.needsUpdate=true;
  }
  reset(){this.setEye("open");this.setMouth("neutral");}
}

export async function mountStewaroFidelMini3D(container,{
  modelUrl,
  idleClip="Idle_12",
  reducedMotion=globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||false
}={}){
  if(!container)throw new Error("FIDEL_CONTAINER_REQUIRED");
  if(!modelUrl)throw new Error("FIDEL_MODEL_URL_REQUIRED");

  const [THREE,loaderModule,patches]=await Promise.all([
    import(THREE_URL),
    import(GLTF_LOADER_URL),
    loadPatches()
  ]);
  const {GLTFLoader}=loaderModule;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(27,1,.01,100);
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,2));
  renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.domElement.className="nw-live-fidel-canvas";
  container.replaceChildren(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xfff8ed,0x26312d,2.5));
  const key=new THREE.DirectionalLight(0xfff1d6,3.4);key.position.set(3,4,5);scene.add(key);
  const fill=new THREE.DirectionalLight(0xdce8ff,1.35);fill.position.set(-4,2,4);scene.add(fill);

  const gltf=await new GLTFLoader().loadAsync(modelUrl);
  const model=gltf.scene;
  scene.add(model);

  let texturedMesh=null;
  model.traverse(o=>{if(!texturedMesh&&o.isMesh&&o.material?.map)texturedMesh=o;});
  if(!texturedMesh)throw new Error("FIDEL_TEXTURED_MESH_NOT_FOUND");

  const face=new FaceTextureController(THREE,texturedMesh.material.map,patches);
  const material=texturedMesh.material.clone();
  material.map=face.texture;material.needsUpdate=true;
  texturedMesh.material=material;

  const box=new THREE.Box3().setFromObject(model);
  const center=box.getCenter(new THREE.Vector3());
  const size=box.getSize(new THREE.Vector3());
  model.position.sub(center);
  const maxDim=Math.max(size.x,size.y,size.z);
  camera.position.set(0,maxDim*.02,maxDim*2.58);
  camera.lookAt(0,maxDim*.04,0);

  const mixer=new THREE.AnimationMixer(model);
  const idle=gltf.animations.find(a=>a.name===idleClip)||gltf.animations.find(a=>/idle/i.test(a.name));
  if(idle)mixer.clipAction(idle).reset().play();

  let speechLevel=0;
  let mouthState="neutral";
  let mouthUntil=0;
  let nextBlink=performance.now()+rand(2600,5600);
  let blinkStarted=0;
  let destroyed=false;
  const clock=new THREE.Clock();

  function mouthFor(now){
    if(speechLevel<.035)return "neutral";
    if(now<mouthUntil)return mouthState;
    const r=Math.random();
    if(speechLevel>.20)mouthState=r<.55?"aa":"e";
    else if(speechLevel>.11)mouthState=r<.34?"e":r<.68?"ou":"ff";
    else mouthState=r<.58?"mbp":"ff";
    mouthUntil=now+rand(72,122);
    return mouthState;
  }
  function blink(now){
    if(reducedMotion){face.setEye("open");return;}
    if(!blinkStarted&&now>=nextBlink)blinkStarted=now;
    if(!blinkStarted)return;
    const t=now-blinkStarted;
    if(t<42)face.setEye("half");
    else if(t<102)face.setEye("closed");
    else if(t<145)face.setEye("half");
    else{face.setEye("open");blinkStarted=0;nextBlink=now+rand(2700,5900);}
  }
  function resize(){
    const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight);
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  }
  const ro=new ResizeObserver(resize);ro.observe(container);resize();

  let raf=0;
  function frame(now){
    if(destroyed)return;
    mixer.update(Math.min(clock.getDelta(),.05));
    blink(now);
    face.setMouth(mouthFor(now));
    renderer.render(scene,camera);
    raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);

  return {
    setSpeechLevel(value){
      speechLevel=clamp(Number(value)||0);
      if(speechLevel<.02){mouthUntil=0;mouthState="neutral";face.setMouth("neutral");}
    },
    blinkNow(){if(!blinkStarted){blinkStarted=performance.now();nextBlink=Infinity;}},
    resetFace(){speechLevel=0;mouthUntil=0;mouthState="neutral";face.reset();},
    destroy(){
      destroyed=true;cancelAnimationFrame(raf);ro.disconnect();mixer.stopAllAction();face.reset();
      model.traverse(o=>{if(o.isMesh){o.geometry?.dispose?.();o.material?.dispose?.();}});
      face.texture.dispose();renderer.dispose();container.replaceChildren();
    }
  };
}
