import random, math, os, numpy
from time import sleep


class Candidate:
    # -10 -> 10
    # progressive - conservative
    # nationalist - globalist
    # environmentalist - economist
    # socialist - capitalist
    def __init__(self, id, name, party, party_pop, prog_cons, nat_glob, env_eco, soc_cap, pac_mil, auth_ana):
        self.id = id
        self.name = name
        self.party = party
        self.party_pop = (party_pop)*0.1
        self.vals = [prog_cons, nat_glob, env_eco, soc_cap, pac_mil, auth_ana]

class Voter:
    def __init__(self, vals):
        self.vals = vals

    def vote(self, candidates):
        global not_voted
        dists = []
        for cand in candidates:
            euc_sum = 0
            for o in range(len(self.vals)):
                euc_sum += (self.vals[o] - cand.vals[o])**2
            euc_dist = math.sqrt(euc_sum)
            euc_dist -= cand.party_pop # take away party popularity
            dists.append(euc_dist)
        index_min = min(range(len(dists)), key=dists.__getitem__) # find preferred candidate
        if dists[index_min] <= 200: # if close enough to vote for them:
            RESULTS[index_min][1] += 1 # add one to vote count of preferred candidate
        else:
            not_voted += 1 # do not vote
        del self
        


def format_votes(votes):
    global scale_factor, scale_fac
    return (f'{abs((votes*scale_factor + (random.randrange(0, int("0" + "9"*scale_fac)) if scale_fac > 1 else 0))):,}')

def print_results(RESULTS):
    os.system('cls' if os.name == 'nt' else 'clear')
    print(COUNTRY + "\n")
    res = sorted(RESULTS,key=lambda l:l[1], reverse=True) # sort by vote count
    
    for i in range(len(res)):
        print(f"{str.ljust(res[i][0].name, 20)} {str.ljust(res[i][0].party, 20)} : {str.ljust(str(round(res[i][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted)*100, 2))+'%', 8)} : {format_votes(res[i][1])} votes " )
    print(f"{str.ljust('Not voted', 52)} : {format_votes(not_voted)}")


def run(data, cands, pop):

    for it in range(VOTING_DEMOS[COUNTRY]["pop"]): # population in tens of thousands

        vot = Voter(VOTING_DEMOS[COUNTRY]["vals"])

        # setting voter values
        for i in range(len(vot.vals)):
            vot.vals[i] = data[i][it]
            if vot.vals[i] >= 100:
                vot.vals[i] = 100
            if vot.vals[i] <= -100:
                vot.vals[i] = -100

        vot.vote(cands) # calling vote

        # showing results
        if it % (pop//50 + 1) == 0:
            print_results(RESULTS)
            sleep(DELAY)

    print_results(RESULTS)
    return sorted(RESULTS,key=lambda l:l[1], reverse=True) # sort by vote count





# ~~~~~~~~~~ CUSTOM USER COUNTRIES ~~~~~~~~~~~~

VOTING_DEMOS = {
    #COUNTRY: [pop in hundreds, prog_cons, nat_glob, env_eco, soc_cap, pac_mil]
    # progressive-conservative, nationalist-globalist, environmentalist-economical, socialist-capitalist, pacifist-militarist, authoritative-anarchist
    "UK": {"pop": 70_029_0, "vals": [-10, -15, 45, 85, -24, -17], "scale":100},
    "GERMANY 1936": {"pop": 61_024_1, "vals":[74, -68, 64, 87, 78, -98], "scale":100},
    "HAMPTON": {"pop": 1_546, "vals": [21, 0, 76, 12, -23, -30], "scale":1},
    "DENMARK": {"pop": 50_843, "vals": [-34, 46, 24, -2, -76, 42], "scale":100},
    "NORTH KOREA": {"pop": 25_083_4, "vals" : [56, -99, 35, -98, 70, -98], "scale":100},
    "USA" : {"pop": 350_000, "vals" : [20, -35, 20, 70, 60, 14], "scale":1000},
    "TURKEY" : {"pop": 87_000_0, "vals" : [50, -34, 21, 65, 34, -47], "scale":100},
    "FINLAND" : {"pop": 55_410, "vals" : [-2, 10, 12, -1, 12, 12], "scale":100},
    "RUSSIA" : {"pop": 143_000, "vals": [43, -62, 71, 69, 75, -61], "scale":1000},
    "SOMALIA" : {"pop" : 17_000_0, "vals": [76, -46, 89, 85, 89, -57], "scale": 100}
    
}

for x in VOTING_DEMOS.keys():
    print(x)
COUNTRY = input("\nPick a country from the list: ")
# SETTING SCALE FACTOR FOR COUNTRY POPULATION
scale_factor = VOTING_DEMOS[COUNTRY]["scale"] # from population to real population
scale_fac = len(str(scale_factor))-1

# SLIGHTLY RANDOMIZING VOTING DEMOGRAPHIC
for p in range(len(VOTING_DEMOS[COUNTRY])):
    VOTING_DEMOS[COUNTRY]["vals"][p] += round(20*(random.random()-0.5)) # randomise by 10 possibility each side



# ~~~~~~~~~~ CUSTOM USER PARTIES ~~~~~~~~~~~~

# progressive-conservative, nationalist-globalist, environmentalist-economical, socialist-capitalist, pacifist-militarist
# the first number does not matter at all
# party popularity is from 1 to 10

CAND_LIST = {
    "UK": [
        Candidate(0, "Rishi Sunak", "Conservative", 8, 65, -24, 76, 71, -2, -21),
        Candidate(1, "Ed Davey", "Lib Dems", 1, -32, 12, 24, 41, -40, -6),
        Candidate(2, "Keir Starmer", "Labour", 10, -21, 41, -11, 0, 4, -1),
        Candidate(3, "Zack Polanski", "Green", 1, -67, 71, -94, -31, -40, 41),
        Candidate(5, "Hannah Sell", "Socialist Party", 1, 23, -85, 23, -96, -30, -5),
        Candidate(4, "Nigel Farage", "Reform Party", 1, 95, -98, 65, 70, 90, -42),
        Candidate(5, "Jeremy Corbyn", "Independent", 0.5, -50, 30, -40, -50, -10, -13),
            Candidate(7, "Theo Evison", "Monarchist", 5, 17, -3, 62, 31, 1, -32),
    ],
    "USA": [
        Candidate(0, "Donald Trump", "Republican", 10, 60, -40, 40, 95, 40, -33),
        Candidate(1, "Joe Biden", "Democrat", 10, 20, 0, 30, 78, 10, -22),
        Candidate(2, "Jo Jorgensen", "Libertarian Party", 2, 30, -50, 90, 90, -40, 71),
        Candidate(3, "Howie Hawkins", "Green Party", 1, -40, 35, -85, -10, -50, -21),
        Candidate(4, "Ron Edwards", "Christian C. Party", 1, 200, -50, 0, -20, 80, -67)
    ],
    "NORTH KOREA": [
        Candidate(0, "Kim Jong-Un", "Worker's Party", 70, 59, -90, 23, -99, 90, -99),
        Candidate(1, "Kim Ho-Chol", "Social Democrat", 20, -20, -20, -20, -60, 50, -150)
    ],
    "FINLAND" : [
        Candidate(0, "", "Soc Dem", 10, -30, 20, -12, -12, -1, -10),
        Candidate(1, "", "Centre Party", 9, 0, 2, 15, 10, -10, -31),
        Candidate(2, "", "Green League", -3, -67, 75, 40, 0, -10, 1),
        Candidate(3, "", "Left Alliance", 4, -30, 0, 10, -60, 0, -1),
        Candidate(4, "", "National Coalition", 9, 34, 30, 40, 75, 10, -45),
        Candidate(5, "", "Finns Party", 9, 68, -30, 20, 60, 49, -79),
    ],
    "HAMPTON" : [
        Candidate(8, "James Greenfield", "KPD", 5, -60, 20, -15, -50, -24, -12),
        Candidate(6, "Danil Eliasov", "Yes Please!", 5, 90, -90, 90, 95, 100, -100),
        Candidate(1, "Zac Nolan", "Party for Change", 5, -32, 80, -30, -5, 10, -14),
        Candidate(7, "Theo Evison", "Monarchist", 5, 17, -3, 62, 31, 1, -32),
        Candidate(8, "Mehmet Altinel", "Turkiye", 5, 80, -50, 50, 98, 30, -78),
        Candidate(11, "Mr Zuckert", "SNP", 1, 100, 100, 100, 100, 100, -200),
        Candidate(12, "William Greenfield", "Economic Reformists", 5, 80, 100, 100, 100, 0, -100),
        Candidate(13, "Ivo Meldrum", "MRL Party", 5, -20, 40, -40, -10, -20, 10)
    ]
}




os.system('cls' if os.name == 'nt' else 'clear') # clear and then ask 
for x in CAND_LIST.keys():
    print(x)
CANDIDATES = CAND_LIST[input("\nPick a party group from the list above:")] # SET CANDIDATE LIST TO USE
for m in range(len(CANDIDATES)):
    CANDIDATES[m].id = m





# ~~~~~~~~~~ MAIN ~~~~~~~~~~~~

RESULTS = []
not_voted = 0
for cand in CANDIDATES:
    RESULTS.append([cand, 0])

TIME = int(input("Time factor: (1->50)")) # seconds
DELAY = (TIME*5)/(math.sqrt(VOTING_DEMOS[COUNTRY]["pop"]))
RUN_OFF_CANDIDATES = 2

data = [ # create normal distributions for each value axis
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"][0], scale = 50, size=VOTING_DEMOS[COUNTRY]["pop"]), # prog - cons
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"][1], scale = 100, size=VOTING_DEMOS[COUNTRY]["pop"]), # nat - glob
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"][2], scale = 150, size=VOTING_DEMOS[COUNTRY]["pop"]), # env - eco
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"][3], scale = 70, size=VOTING_DEMOS[COUNTRY]["pop"]), # soc - cap
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"][4], scale = 120, size=VOTING_DEMOS[COUNTRY]["pop"]), # pac - mil
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"][5], scale = 160, size=VOTING_DEMOS[COUNTRY]["pop"]), # auth - ana
]

# running main program
results = run(data, CANDIDATES, VOTING_DEMOS[COUNTRY]['pop'])

runoff_counter = len(CANDIDATES)-1

while results[0][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) < 0.5: # if nobody has a majority:
    not_voted = 0
    print(f"\n{results[0][0].name} of the {results[0][0].party} party has won a plurality by a margin of {round((results[0][1]-results[1][1])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) * 100, 2)}% ({format_votes(results[0][1]-results[1][1])} votes)!")


    print("No candidate has received a majority. The election will proceed to another round.")
    input()

    new_cands = [x[0] for x in results[:runoff_counter]] # knockout the lowest candidate
    for x in range(len(new_cands)):
        new_cands[x].id = x

    RESULTS = []
    for cand in new_cands:
        RESULTS.append([cand, 0])

    results = run(data, new_cands, VOTING_DEMOS[COUNTRY]['pop'])
    runoff_counter -= 1

if results[0][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) > 0.5:
    print(f"\n{results[0][0].name} of the {results[0][0].party} party has won the election by a margin of {round((results[0][1]-results[1][1])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) * 100, 2)}% ({format_votes(results[0][1]-results[1][1])} votes) with a majority by a margin of {round((results[0][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) - 0.5)*100, 2)}%!")
else:
    print(f"\n{results[0][0].name} of the {results[0][0].party} party has won the runoff election by a margin of {round((results[0][1]-results[1][1])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) * 100, 2)}% ({format_votes(results[0][1]-results[1][1])} votes)!")
