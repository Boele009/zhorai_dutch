animal=$1

echo &(python3 animalEco.py "$animal" 2>&1)
