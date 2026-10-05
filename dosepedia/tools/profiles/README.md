# Profile generator

Scaffolding used to write the 50 files in `data/substances/`. Each cluster file
(`opioids.py`, `sedatives.py`, `stimulants.py`, `others.py`, `psychedelics.py`,
`emerging.py`) calls the shared templates in `common.py`: legal access by
schedule, ordering online, emergency steps, penalties, and the shared source
list. Citations are written as `[[key]]` and renumbered per profile.

```sh
cd tools/profiles && python3 opioids.py   # rewrites the opioid JSON files
```

Running a script overwrites the JSON it generates. If you edit a profile's JSON
directly, make the same change here or stop regenerating that file.
