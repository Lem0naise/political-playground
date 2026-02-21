
import json

path = '/home/indigo/Code/political-playground/public/data/parties.json'

with open(path, 'r') as f:
    data = json.load(f)

additions = {
    "UK": [
        {
            "id": 5,
            "name": "Stephen Flynn",
            "party": "SNP",
            "party_pop": 5,
            "prog_cons": -30,
            "nat_glob": -50,
            "env_eco": -20,
            "soc_cap": -40,
            "pac_mil": -10,
            "auth_ana": 20,
            "rel_sec": 60,
            "colour": "yellow"
        },
        {
            "id": 6,
            "name": "Rhun ap Iorwerth",
            "party": "Plaid Cymru",
            "party_pop": 2,
            "prog_cons": -40,
            "nat_glob": -60,
            "env_eco": -50,
            "soc_cap": -30,
            "pac_mil": -20,
            "auth_ana": 30,
            "rel_sec": 70,
            "colour": "green"
        }
    ],
    "USA": [
        {
            "id": 5,
            "name": "Jill Stein",
            "party": "Green Party",
            "party_pop": 1,
            "prog_cons": -80,
            "nat_glob": 70,
            "env_eco": -95,
            "soc_cap": -50,
            "pac_mil": -85,
            "auth_ana": 40,
            "rel_sec": 85,
            "colour": "green"
        }
    ],
    "GERMANY": [
        {
            "id": 5,
            "name": "Sahra Wagenknecht",
            "party": "BSW",
            "party_pop": 6,
            "prog_cons": 40,
            "nat_glob": -60,
            "env_eco": 30,
            "soc_cap": -90,
            "pac_mil": -70,
            "auth_ana": -20,
            "rel_sec": 20,
            "colour": "purple"
        },
        {
            "id": 6,
            "name": "Heidi Reichinnek",
            "party": "The Left",
            "party_pop": 3,
            "prog_cons": -70,
            "nat_glob": -10,
            "env_eco": -45,
            "soc_cap": -95,
            "pac_mil": -80,
            "auth_ana": 30,
            "rel_sec": 90,
            "colour": "darkred"
        }
    ],
    "FRANCE": [
        {
            "id": 4,
            "name": "Olivier Faure",
            "party": "Socialist Party",
            "party_pop": 5,
            "prog_cons": -35,
            "nat_glob": 55,
            "env_eco": -20,
            "soc_cap": -60,
            "pac_mil": -10,
            "auth_ana": 0,
            "rel_sec": 65,
            "colour": "pink"
        },
        {
            "id": 5,
            "name": "Fabien Roussel",
            "party": "Communist Party",
            "party_pop": 3,
            "prog_cons": -50,
            "nat_glob": -15,
            "env_eco": -10,
            "soc_cap": -98,
            "pac_mil": 20,
            "auth_ana": -20,
            "rel_sec": 80,
            "colour": "red"
        },
        {
            "id": 6,
            "name": "Éric Zemmour",
            "party": "Reconquête",
            "party_pop": 4,
            "prog_cons": 98,
            "nat_glob": -98,
            "env_eco": 60,
            "soc_cap": 20,
            "pac_mil": 40,
            "auth_ana": -95,
            "rel_sec": -60,
            "colour": "black"
        }
    ],
    "CANADA": [
        {
            "id": 3,
            "name": "Yves-François Blanchet",
            "party": "Bloc Québécois",
            "party_pop": 7,
            "prog_cons": -20,
            "nat_glob": -90,
            "env_eco": -30,
            "soc_cap": -40,
            "pac_mil": -20,
            "auth_ana": 20,
            "rel_sec": 95,
            "colour": "cyan"
        },
        {
            "id": 4,
            "name": "Elizabeth May",
            "party": "Green Party",
            "party_pop": 2,
            "prog_cons": -85,
            "nat_glob": 60,
            "env_eco": -98,
            "soc_cap": -30,
            "pac_mil": -60,
            "auth_ana": 45,
            "rel_sec": 90,
            "colour": "green"
        }
    ],
    "ITALY": [
        {
            "id": 5,
            "name": "Nicola Fratoianni",
            "party": "AVS",
            "party_pop": 4,
            "prog_cons": -80,
            "nat_glob": 40,
            "env_eco": -95,
            "soc_cap": -85,
            "pac_mil": -90,
            "auth_ana": 60,
            "rel_sec": 95,
            "colour": "green"
        },
        {
            "id": 6,
            "name": "Carlo Calenda",
            "party": "Azione",
            "party_pop": 3,
            "prog_cons": -40,
            "nat_glob": 85,
            "env_eco": 10,
            "soc_cap": 60,
            "pac_mil": 35,
            "auth_ana": 65,
            "rel_sec": 60,
            "colour": "blue"
        }
    ],
    "SPAIN": [
        {
            "id": 5,
            "name": "Carles Puigdemont",
            "party": "Junts",
            "party_pop": 3,
            "prog_cons": -10,
            "nat_glob": -98,
            "env_eco": 20,
            "soc_cap": 15,
            "pac_mil": -10,
            "auth_ana": 70,
            "rel_sec": 50,
            "colour": "cyan"
        },
        {
            "id": 6,
            "name": "Gabriel Rufián",
            "party": "ERC",
            "party_pop": 3,
            "prog_cons": -60,
            "nat_glob": -95,
            "env_eco": -40,
            "soc_cap": -85,
            "pac_mil": -20,
            "auth_ana": 60,
            "rel_sec": 80,
            "colour": "yellow"
        },
        {
            "id": 7,
            "name": "Aitor Esteban",
            "party": "PNV",
            "party_pop": 2,
            "prog_cons": 15,
            "nat_glob": -60,
            "env_eco": 35,
            "soc_cap": 65,
            "pac_mil": 10,
            "auth_ana": 20,
            "rel_sec": 45,
            "colour": "green"
        }
    ],
    "ISRAEL": [
        {
            "id": 6,
            "name": "Benny Gantz",
            "party": "National Unity",
            "party_pop": 10,
            "prog_cons": 15,
            "nat_glob": 20,
            "env_eco": 30,
            "soc_cap": 45,
            "pac_mil": 45,
            "auth_ana": 20,
            "rel_sec": 35,
            "colour": "blue"
        },
        {
            "id": 7,
            "name": "Avigdor Lieberman",
            "party": "Yisrael Beiteinu",
            "party_pop": 6,
            "prog_cons": 60,
            "nat_glob": -30,
            "env_eco": 65,
            "soc_cap": 85,
            "pac_mil": 95,
            "auth_ana": -40,
            "rel_sec": 95,
            "colour": "navy"
        },
        {
            "id": 8,
            "name": "Yair Golan",
            "party": "The Democrats",
            "party_pop": 5,
            "prog_cons": -55,
            "nat_glob": 35,
            "env_eco": -45,
            "soc_cap": -65,
            "pac_mil": 30,
            "auth_ana": 45,
            "rel_sec": 85,
            "colour": "red"
        }
    ],
    "TURKEY": [
        {
            "id": 2,
            "name": "Devlet Bahçeli",
            "party": "MHP",
            "party_pop": 6,
            "prog_cons": 95,
            "nat_glob": -98,
            "env_eco": 80,
            "soc_cap": 40,
            "pac_mil": 95,
            "auth_ana": -90,
            "rel_sec": -60,
            "colour": "darkred"
        },
        {
            "id": 3,
            "name": "Tülay Hatimoğulları",
            "party": "DEM Party",
            "party_pop": 9,
            "prog_cons": -70,
            "nat_glob": -60,
            "env_eco": -50,
            "soc_cap": -95,
            "pac_mil": -85,
            "auth_ana": 85,
            "rel_sec": 90,
            "colour": "purple"
        }
    ],
    "JAPAN": [
        {
            "id": 2,
            "name": "Nobuyuki Baba",
            "party": "Ishin",
            "party_pop": 5,
            "prog_cons": 45,
            "nat_glob": 10,
            "env_eco": 65,
            "soc_cap": 90,
            "pac_mil": 30,
            "auth_ana": 60,
            "rel_sec": 20,
            "colour": "green"
        },
        {
            "id": 3,
            "name": "Natsuo Yamaguchi",
            "party": "Komeito",
            "party_pop": 4,
            "prog_cons": 30,
            "nat_glob": -10,
            "env_eco": 20,
            "soc_cap": -10,
            "pac_mil": -60,
            "auth_ana": -20,
            "rel_sec": -40,
            "colour": "pink"
        }
    ],
    "AUSTRALIA": [
        {
            "id": 3,
            "name": "David Littleproud",
            "party": "Nationals",
            "party_pop": 4,
            "prog_cons": 85,
            "nat_glob": -60,
            "env_eco": 95,
            "soc_cap": 60,
            "pac_mil": 50,
            "auth_ana": -30,
            "rel_sec": -20,
            "colour": "darkgreen"
        }
    ],
    "GEORGIA": [
        {
            "id": 0,
            "name": "Irakli Kobakhidze",
            "party": "Georgian Dream",
            "party_pop": 10,
            "prog_cons": 75,
            "nat_glob": -65,
            "env_eco": 55,
            "soc_cap": 25,
            "pac_mil": 45,
            "auth_ana": -85,
            "rel_sec": -60,
            "colour": "indigo"
        },
        {
            "id": 1,
            "name": "Tina Bokuchava",
            "party": "Unity - National Movement",
            "party_pop": 8,
            "prog_cons": -35,
            "nat_glob": 75,
            "env_eco": 25,
            "soc_cap": 45,
            "pac_mil": 35,
            "auth_ana": 65,
            "rel_sec": 75,
            "colour": "red"
        }
    ]
}

for country, new_parties in additions.items():
    if country in data:
        data[country].extend(new_parties)

with open(path, 'w') as f:
    json.dump(data, f, indent=4)
