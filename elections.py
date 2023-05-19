import random, math, os, numpy, difflib
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
        self.party_pop = (party_pop)*3
        self.vals = [prog_cons, nat_glob, env_eco, soc_cap, pac_mil, auth_ana]

class Voter:
    def __init__(self, vals):
        self.vals = vals

    def vote(self, candidates):
        global not_voted
        dists = []
        for cand in candidates:
            euc_sum = 0
            for o in range(len(self.vals)): # sum square of each value
                euc_sum += (self.vals[o] - cand.vals[o])**2
            euc_dist = math.sqrt(euc_sum) # square root to find euclidean distance
            euc_dist -= cand.party_pop # take away party popularity from distance
            dists.append(euc_dist) # add to distance list
        index_min = min(range(len(dists)), key=dists.__getitem__) # find preferred candidate by closest distance
        if dists[index_min] <= 200: # if close enough to vote for them:
            RESULTS[index_min][1] += 1 # add one to vote count of preferred candidate
        else: # if too radical for any party
            not_voted += 1 # do not vote
        del self
        


def format_votes(votes):
    global scale_factor, scale_fac
    return (f'{abs((votes*scale_factor + (random.randrange(0, int("0" + "9"*scale_fac)) if scale_fac > 1 else 0))):,}')

def print_results(RESULTS):

    res = sorted(RESULTS,key=lambda l:l[1], reverse=True) # sort by vote count
    os.system('cls' if os.name == 'nt' else 'clear')
    print(COUNTRY + "\n")
    for i in range(len(res)):
        
        print(f"{str.ljust(res[i][0].name, 20)} {str.ljust(res[i][0].party, 20)} : {str.ljust(str(round(res[i][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted)*100, 2))+'%', 8)} : {format_votes(res[i][1])} votes " )
    print(f"{str.ljust('Not voted', 52)} : {format_votes(not_voted)}")
    print()

def print_final_results(RESULTS, first=True, old_res = []):

    res = sorted(RESULTS,key=lambda l:l[1], reverse=True) # sort by vote count
    os.system('cls' if os.name == 'nt' else 'clear')
    print(COUNTRY + "\n")
    for i in range(len(res)):
        if not first: # print with the percentage change
            print(f"{str.ljust(res[i][0].name, 20)} {str.ljust(res[i][0].party, 20)} : {str.ljust(str(round(res[i][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted)*100, 2))+'%', 8)} {str.ljust('[+' + str(round((res[i][1]-old_res[res[i][0]])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted)*100, 2)) + '%]', 10)}: {format_votes(res[i][1])} votes " )
        else:
            print(f"{str.ljust(res[i][0].name, 20)} {str.ljust(res[i][0].party, 20)} : {str.ljust(str(round(res[i][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted)*100, 2))+'%', 8)} : {format_votes(res[i][1])} votes " )

    print(f"{str.ljust('Not voted', 52)} : {format_votes(not_voted)}")
    print()


def run(data, cands, pop):

    loc_pop = VOTING_DEMOS[COUNTRY]["pop"]
    for it in range(loc_pop): # population in tens of thousands

        vot = Voter(VOTING_DEMOS[COUNTRY]["vals"])

        # setting voter values from massive dataset
        for i in range(len(vot.vals)):
            vot.vals[i] = data[i][it] # go through each data set from leftmost to rightmost
            if vot.vals[i] >= 100:
                vot.vals[i] = 100
            if vot.vals[i] <= -100:
                vot.vals[i] = -100

        vot.vote(cands) # calling vote

        # showing results
        if it % (pop//60 + 1) == 0:
            print_results(RESULTS)
            sleep(DELAY)

    print_final_results(RESULTS)
    return sorted(RESULTS,key=lambda l:l[1], reverse=True) # sort by vote count





# ~~~~~~~~~~ CUSTOM USER COUNTRIES ~~~~~~~~~~~~

VOTING_DEMOS = {
    #COUNTRY: [pop in hundreds, prog_cons, nat_glob, env_eco, soc_cap, pac_mil]
    # progressive-conservative, nationalist-globalist, environmentalist-economical, socialist-capitalist, pacifist-militarist, authoritative-anarchist
    "UK": {"pop": 70_029_0, "vals": [-10, -15, 45, 85, -24, -17], "scale":100},
    "GERMANY 1936": {"pop": 61_024_1, "vals":[120, -68, 64, 87, 78, -98], "scale":100},
    "GERMANY" : {"pop" : 85_029_5, "vals" : [-12, 34, 24, 12, 24, -1], "scale":100},
    "HAMPTON": {"pop": 1_546, "vals": [21, 0, 76, 12, -23, -30], "scale":1},
    "DENMARK": {"pop": 50_843, "vals": [-34, 46, 0, -2, -21, 42], "scale":100},
    "NORTH KOREA": {"pop": 25_083_4, "vals" : [56, -99, 35, -98, 70, -98], "scale":100},
    "USA" : {"pop": 350_000, "vals" : [20, -35, 20, 70, 60, 14], "scale":1000},
    "TURKEY" : {"pop": 87_000_0, "vals" : [50, -34, 21, 65, 34, -47], "scale":100},
    "FINLAND" : {"pop": 55_410, "vals" : [-2, 10, 12, -1, 12, 12], "scale":100},
    "RUSSIA" : {"pop": 143_000, "vals": [43, -62, 71, 69, 75, -61], "scale":1000},
    "SOMALIA" : {"pop" : 17_000_0, "vals": [76, -46, 89, 85, 89, -57], "scale": 100},
    
}

for x in VOTING_DEMOS.keys():
    print(x)
COUNTRY = difflib.get_close_matches(input("\nPick a country from the list: ").upper().strip(), VOTING_DEMOS.keys(), 1)[0] # get closest country
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
        Candidate(2, "Keir Starmer", "Labour", 10, -21, 41, -11, 14, 4, -1),
        Candidate(5, "Hannah Sell", "Socialist Party", 1, -10, -11, 23, -41, -30, -5),
        Candidate(3, "Zack Polanski", "Green", 1, -67, 71, -94, -31, -40, 41),
        Candidate(4, "Nigel Farage", "Reform Party", 1, 95, -98, 65, 70, 90, -42),
        Candidate(5, "Jeremy Corbyn", "Independent", 0.5, -50, 30, -40, -50, -10, -13),
    ],
    "USA": [
        Candidate(0, "Donald Trump", "Republican", 10, 60, -40, 40, 95, 40, -33),
        Candidate(1, "Joe Biden", "Democrat", 10, 20, 0, 30, 78, 10, -22),
        Candidate(2, "Jo Jorgensen", "Libertarian Party", 2, 30, -50, 90, 90, -40, 71),
        Candidate(3, "Howie Hawkins", "Green Party", 1, -40, 35, -85, -10, -50, -21),
        Candidate(4, "Ron Edwards", "Christian C. Party", 3, 200, -50, 0, -20, 80, -67)
    ],
    "GERMANY 1936": [
        Candidate(0, "Otto Wels", "SPD", 10, 12, -35, 24, -21, 36, 4),
        Candidate(1, "Hadolf Itler", "NDSAP", 7, 98, -78, -1, -13, 86, -86),
        Candidate(3, "Ernst Thalman", "KPD", 7, -34, -56, 24, -67, 78, 57),
        Candidate(0, "Ludwig Kaas", "Centre", 5, 0, -12, 41, 12, 6, -12),
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
        Candidate(8, "James Greenfield", "KPD", 5,
                prog_cons= -60, 
                nat_glob= 20, 
                env_eco= -15,
                soc_cap= -50,
                pac_mil=  -24,
                auth_ana= -12),
        
        Candidate(6, "Danil Eliasov", "Yes Please!", 5,
                prog_cons= 90, 
                nat_glob= -90, 
                env_eco= 90,
                soc_cap= 95,
                pac_mil=  100,
                auth_ana= -100),

        Candidate(1, "Zac Nolan", "Peace and Prosperity", 5, 
                prog_cons= -21, 
                nat_glob= 39, 
                env_eco= -1,
                soc_cap= -5,
                pac_mil= -5,
                auth_ana= 14),

        Candidate(7, "Theo Evison", "Prevalence", 5,
                prog_cons= 17, 
                nat_glob= -3, 
                env_eco= 30,
                soc_cap= 31,
                pac_mil=  1,
                auth_ana= -32),

        Candidate(8, "Mehmet Altinel", "Front", 5,
                prog_cons= 80, 
                nat_glob= -50, 
                env_eco= 50,
                soc_cap= 98,
                pac_mil=  30,
                auth_ana= -78),

        Candidate(12, "William Greenfield", "Economic Reformists", 5, 80, 100, 100, 100, 0, -100),
        Candidate(13, "Ivo Meldrum", "Monster Raving Loony", 5, -20, 40, -40, -10, -20, 10),
        Candidate(14, "Alex Wicks", "Britain First", 5, 
                prog_cons = -20,
                nat_glob = 70,
                env_eco = -50,
                soc_cap = 65,
                pac_mil = -30,
                auth_ana = 25),
            Candidate(15, "Billiam the Third", "Confetto", 5, 
                prog_cons = 50,
                nat_glob = -90,
                env_eco = 79,
                soc_cap = 60,
                pac_mil = 85,
                auth_ana = -95),
    ],
    "GERMANY" : [
        Candidate(0, "Olaf Scholz", "SPD", 10, 
                prog_cons= -31,
                nat_glob= 45,
                env_eco= 3,
                soc_cap= -4,
                pac_mil= 12,
                auth_ana= 12),
        Candidate(1, "Friedrich Merz", "CDU", 9, 
                prog_cons= 24,
                nat_glob= 44,
                env_eco= 14,
                soc_cap= 24,
                pac_mil= 10,
                auth_ana= -12),
        Candidate(3, "Ricarda Lang", "Alliance 90", 7, 
                prog_cons= -35,
                nat_glob= 45,
                env_eco= -45,
                soc_cap= -1,
                pac_mil= -23,
                auth_ana= 34),
        Candidate(4, "Tino Chrupalla", "AfD", 3,
                prog_cons= 78,
                nat_glob= -45,
                env_eco= 45,
                soc_cap= 45,
                pac_mil= 45,
                auth_ana= -45),
    ],
    "RADICALS" : [
        Candidate(0, "Karl Max", "Communist America", 5, 
                prog_cons=-100,
                nat_glob= 100,
                env_eco= -100,
                soc_cap= -100,
                pac_mil= -100,
                auth_ana= -100),
        Candidate(0, "Jonathan Facsist", "America First", 5, 
                prog_cons=100,
                nat_glob= -100,
                env_eco= 100,
                soc_cap= 100,
                pac_mil= 100,
                auth_ana= 100),
                
    ]
}




os.system('cls' if os.name == 'nt' else 'clear') # clear and then ask 
for x in CAND_LIST.keys():
    print(x)
CANDIDATES = CAND_LIST[difflib.get_close_matches(input("\nPick a party group from the list above: ").upper().strip(), CAND_LIST.keys(), 1)[0]] # SET CANDIDATE LIST TO USE
for m in range(len(CANDIDATES)):
    CANDIDATES[m].id = m





# ~~~~~~~~~~ MAIN ~~~~~~~~~~~~

RESULTS = []
not_voted = 0
for cand in CANDIDATES:
    RESULTS.append([cand, 0])

TIME = float(input("Delay : (0->50) ")) # seconds
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

runoff_counter = 4 if len(CANDIDATES) > 4 else len(CANDIDATES)-1

while results[0][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) < 0.5: # if nobody has a majority:

    # print plurality winner
    print(f"The {results[0][0].party} party {('(led by ' + results[0][0].name + ')') if (results[0][0].name!='') else ''} have won a plurality by a margin of {round((results[0][1]-results[1][1])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) * 100, 2)}% ({format_votes(results[0][1]-results[1][1])} votes)!")    
    print("No candidate has received a majority. The election will proceed to another round.")
    input()
    not_voted = 0 # reset not voted 


    # save old results as a dictionary
    old_results = {RESULTS[x][0] : RESULTS[x][1] for x in range(len(RESULTS))} 

    new_cands = [x[0] for x in results[:runoff_counter]] # knockout the lowest candidate
    for x in range(len(new_cands)): # reset candidate ids
        new_cands[x].id = x

    RESULTS = [] # reset RESULTS
    for cand in new_cands:
        RESULTS.append([cand, 0])


    results = run(data, new_cands, VOTING_DEMOS[COUNTRY]['pop']) # run the elections again
    runoff_counter -= 1
    print_final_results(RESULTS, False, old_results)


print(f"\nThe {results[0][0].party} party {('(led by ' + results[0][0].name + ')') if (results[0][0].name!='') else ''} have won the election by a margin of {round((results[0][1]-results[1][1])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) * 100, 2)}% ({format_votes(results[0][1]-results[1][1])} votes) with a majority by a margin of {round((results[0][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) - 0.5)*100, 2)}%!")
