import random, math, os, numpy
from time import sleep


class Candidate:
    # -10 -> 10
    # progressive - conservative
    # nationalist - globalist
    # environmentalist - economist
    # socialist - capitalist
    def __init__(self, id, name, party, prog_cons, nat_glob, env_eco, soc_cap, pac_mil):
        self.id = id
        self.name = name
        self.party = party
        self.vals = [prog_cons, nat_glob, env_eco, soc_cap, pac_mil]

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
            dists.append(euc_dist)
        index_min = min(range(len(dists)), key=dists.__getitem__) # find preferred candidate
        if dists[index_min] <= 200: # if close enough to vote for them:
            RESULTS[index_min][1] += 1 # add one to vote count of preferred candidate
        else:
            not_voted += 1 # do not vote
        del self
        


def format_votes(votes):
    global scale_factor, scale_fac
    return (f'{(votes*scale_factor + random.randrange(-int("9"*scale_fac), int("9"*scale_fac))):,}')

def print_results(RESULTS):
    os.system('cls' if os.name == 'nt' else 'clear')
    res = sorted(RESULTS,key=lambda l:l[1], reverse=True) # sort by vote count
    
    for i in range(len(res)):
        print(f"{str.ljust(res[i][0].name, 20)} {str.ljust(res[i][0].party, 20)} : {str.ljust(str(round(res[i][1]/VOTING_DEMOS[COUNTRY]['pop']*100, 2))+'%', 8)} : {format_votes(res[i][1])} votes " )
    print(f"{str.ljust('Not voted', 42)} : {format_votes(not_voted)}")


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
        if it % (pop//50) == 0:
            print_results(RESULTS)
            sleep(DELAY)

    print_results(RESULTS)
    return sorted(RESULTS,key=lambda l:l[1], reverse=True) # sort by vote count





# ~~~~~~~~~~ CUSTOM USER COUNTRIES ~~~~~~~~~~~~

VOTING_DEMOS = {
    #COUNTRY: [pop in hundreds, prog_cons, nat_glob, env_eco, soc_cap, pac_mil]
    # progressive-conservative, nationalist-globalist, environmentalist-economical, socialist-capitalist, pacifist-militarist
    "UK": {"pop": 70_029_0, "vals": [60, -25, 45, 85, -24]},
    "GERMANY 1936": {"pop": 61_024_1, "vals":[74, -68, 64, 87, 78]},
    "HAMPTON": {"pop": 1_546, "vals": [21, 0, 76, 12, -23]},
    "DENMARK": {"pop": 50_843, "vals": [-34, 46, 24, -2, -76]},
    "NORTH KOREA": {"pop": 25_083_4, "vals" : [56, -99, 35, -98, 70]},
    "USA" : {"pop": 350_000_0, "vals" : [-5, 3, 20, 46, 60]}
}
COUNTRY = "HAMPTON"
# SETTING SCALE FACTOR FOR COUNTRY POPULATION
scale_factor = VOTING_DEMOS[COUNTRY] # from population to real population
scale_fac = len(str(scale_factor))-1

# SLIGHTLY RANDOMIZING VOTING DEMOGRAPHIC
for p in range(len(VOTING_DEMOS[COUNTRY])):
    VOTING_DEMOS[COUNTRY]["vals"][p] += 20*(random.random()-0.5) # randomise by 10 possibility each side



# ~~~~~~~~~~ CUSTOM USER PARTIES ~~~~~~~~~~~~

# the first number does not matter at all
uk_parties = [
    Candidate(0, "Rishi Sunak", "Conservative", 65, -24, 76, 71, -2),
    Candidate(1, "Ed Davey", "Lib Dems", -32, 12, 24, 41, -40),
    Candidate(2, "Jeremy Corbyn", "Labour", -21, 41, -11, -12, 4),
    Candidate(3, "Zack Polanski", "Green", -67, 71, -94, -31, -40),
    Candidate(5, "Hannah Sell", "Socialist Party", 23, -85, 23, -96, -30),
    #Candidate(4, "Oswald Mosley", "Britain First", 95, -98, 65, 2, 96),
]
friends = [
    Candidate(8, "James Greenfield", "CPdD", -60, 0, -10, -35, -24),
    Candidate(6, "Danil Eliasov", "Yes Please!", 90, -90, 90, 95, 100),
    Candidate(1, "Zac Nolan", "Party for Change", -74, 80, -30, -5, 10),
    Candidate(7, "Theo Evison", "Monarchist", 70, 10, 50, 80, 45),
    Candidate(8, "Mehmet Altinel", "Turkiye", 80, -50, 50, 98, 30),
    Candidate(11, "Mr Zuckert", "SNP", 100, 100, 100, 100, 100)
]
CANDIDATES = friends # SET CANDIDATE LIST TO USE
for m in range(len(CANDIDATES)):
    CANDIDATES[m].id = m





# ~~~~~~~~~~ MAIN ~~~~~~~~~~~~

RESULTS = []
not_voted = 0
for cand in CANDIDATES:
    RESULTS.append([cand, 0])

TIME = 2 # seconds
DELAY = (TIME*5)/(math.sqrt(VOTING_DEMOS[COUNTRY]["pop"]))
RUN_OFF_CANDIDATES = 2

data = [ # create normal distributions for each value axis
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"][0], scale = 100, size=VOTING_DEMOS[COUNTRY]["pop"]), # prog - cons
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"][1], scale = 100, size=VOTING_DEMOS[COUNTRY]["pop"]), # nat - glob
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"][2], scale = 100, size=VOTING_DEMOS[COUNTRY]["pop"]), # env - eco
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"][3], scale = 100, size=VOTING_DEMOS[COUNTRY]["pop"]), # soc - cap
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"][3], scale = 100, size=VOTING_DEMOS[COUNTRY]["pop"]), # pac - mil
]

# running main program
results = run(data, CANDIDATES, VOTING_DEMOS[COUNTRY]['pop'])


if results[0][1]/VOTING_DEMOS[COUNTRY]['pop'] < 0.5: # if nobody has a majority:
    print(f"\n{results[0][0].name} of the {results[0][0].party} party has won a plurality by a margin of {round((results[0][1]-results[1][1])/VOTING_DEMOS[COUNTRY]['pop'] * 100, 2)}% ({format_votes(results[0][1]-results[1][1])} votes)!")
    print("No candidate has received a majority. The election will proceed to a second round.")
    input()

    new_cands = [x[0] for x in results[:RUN_OFF_CANDIDATES]] # two highest candidates
    for x in range(len(new_cands)):
        new_cands[x].id = x


    RESULTS = []
    for cand in new_cands:
        RESULTS.append([cand, 0])

    results = run(data, new_cands, VOTING_DEMOS[COUNTRY]['pop'])
    print(f"\n{results[0][0].name} of the {results[0][0].party} party has won the runoff election by a margin of {round((results[0][1]-results[1][1])/VOTING_DEMOS[COUNTRY]['pop'] * 100, 2)}% ({format_votes(results[0][1]-results[1][1])} votes)!")

else: # majority
    print(f"\n{results[0][0].name} of the {results[0][0].party} party has won the election by a margin of {round((results[0][1]-results[1][1])/VOTING_DEMOS[COUNTRY]['pop'] * 100, 2)}% with a majority by a margin of {round((results[0][1]/VOTING_DEMOS[COUNTRY]['pop'] - 0.5)*100, 2)}% ({format_votes(results[0][1]-results[1][1])} votes)!")
