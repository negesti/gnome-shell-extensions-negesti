#!/bin/bash
TARGET="putWindow@clemens.lab21.org.zip"

cd putWindow@clemens.lab21.org

echo "recompiling schema file..."
cd schemas
make
cd ..

echo "Zip it"
zip -r $TARGET *

mv $TARGET ..

# http://whatthecommit.com/0e0c1a4060a298158f3c4ef526f03f86
echo "
    (\ /)
    (O.o)
    (> <)
            Bunny approves these changes

    http://whatthecommit.com/c3fa809433d7131c1bb92e4ba0d372b8
"

